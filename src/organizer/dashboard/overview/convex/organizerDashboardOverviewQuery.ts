import { v } from "convex/values"
import * as a from "valibot"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import {
  organizerDashboardBerlinDayRangeCreate,
  organizerDashboardBerlinDayOf,
  organizerDashboardBerlinToday,
} from "#src/organizer/dashboard/finance/organizerDashboardBerlinDay.ts"
import { organizerDashboardFinanceEventScopeGet } from "#src/organizer/dashboard/finance/convex/organizerDashboardFinanceEventScopeGet.ts"
import {
  organizerDashboardOverviewFilterSchema,
  type OrganizerDashboardOverviewFilter,
} from "#src/organizer/dashboard/overview/organizerDashboardOverviewFilterSchema.ts"
import {
  organizerDashboardOverviewStatsCreate,
  type OrganizerDashboardOverviewDaySale,
} from "#src/organizer/dashboard/overview/organizerDashboardOverviewStatsCreate.ts"

export type OrganizerDashboardOverviewEventRow = {
  eventKey: string
  title: string
  startsAt: string
  revenueCents: number
  tickets: number
  occupancyBps: number
}

export type OrganizerDashboardOverview = {
  fromDay: string
  toDay: string
  revenueCents: number
  tickets: number
  orders: number
  avgOrderCents: number
  occupancyBps: number
  deltas: { revenue: number | null; tickets: number | null; orders: number | null; avgOrder: number | null }
  series: readonly { day: string; revenueCents: number; tickets: number; orders: number }[]
  events: OrganizerDashboardOverviewEventRow[]
  truncated: boolean
}

const MAX_ORDERS_PER_EVENT = 5000
const MAX_TICKETS_PER_EVENT = 20000

const rangeDays = { "7": 7, "30": 30, "365": 365 } as const

/**
 * Aggregated organizer KPIs over Europe/Berlin day buckets: revenue, tickets,
 * occupancy and the sales curve with previous-window deltas. Reads the same
 * live ticketOrders/ticketIssued/tiers as finance; permission umsatz.sehen.
 */
export const organizerDashboardOverviewQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.optional(v.string()),
    fromDay: v.optional(v.string()),
    toDay: v.optional(v.string()),
    range: v.optional(v.string()),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardOverview> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, ...input }) => {
      const op = "organizerDashboardOverviewQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "umsatz.sehen")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardOverviewFilterSchema, {
        orgId: String(orgId),
        ...(input as Omit<OrganizerDashboardOverviewFilter, "orgId">),
      })
      if (!filters.success) return createResultError(op, filters.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const nowIso = new Date().toISOString()
      const endDay = filters.output.toDay ?? organizerDashboardBerlinToday(nowIso)
      const windowDays = rangeDays[filters.output.range ?? "30"]
      const startDay =
        filters.output.fromDay ??
        new Date(Date.parse(`${endDay}T12:00:00.000Z`) - (windowDays - 1) * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      const range = organizerDashboardBerlinDayRangeCreate(startDay, endDay)
      if (!range.success) return createResultError(op, range.errorMessage)
      const days = range.days
      const previousEnd = new Date(Date.parse(`${startDay}T12:00:00.000Z`) - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
      const previousStart = new Date(
        Date.parse(`${previousEnd}T12:00:00.000Z`) - (days.length - 1) * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10)
      const previousRange = organizerDashboardBerlinDayRangeCreate(previousStart, previousEnd)
      if (!previousRange.success) return createResultError(op, previousRange.errorMessage)
      const previousDays = new Set(previousRange.days)

      const events =
        filters.output.eventKey === undefined
          ? await ctx.db
              .query("catalogEvents")
              .withIndex("orgId", (q) => q.eq("orgId", orgId))
              .collect()
          : await organizerDashboardFinanceEventScopeGet(ctx, orgId, filters.output.eventKey, op).then((scope) => {
              if (!scope.success) return null
              return [scope.data.event]
            })
      if (events === null) return createResultError(op, "Veranstaltung nicht verfügbar")

      const sales: OrganizerDashboardOverviewDaySale[] = []
      const previous: OrganizerDashboardOverviewDaySale[] = []
      const eventRows: OrganizerDashboardOverviewEventRow[] = []
      let capacity = 0
      let soldTickets = 0
      let truncated = false
      for (const event of events) {
        if (!event || event.deletedAt) continue
        const orders = await ctx.db
          .query("ticketOrders")
          .withIndex("orgIdAndEventKeyAndCreatedAt", (q) => q.eq("orgId", orgId).eq("eventKey", event.eventKey))
          .take(MAX_ORDERS_PER_EVENT)
        truncated = truncated || orders.length >= MAX_ORDERS_PER_EVENT
        const paid = orders.filter((order) => order.status === "paid" && order.orgId === orgId)
        const paidDay = new Map(
          paid.map((order) => [String(order._id), organizerDashboardBerlinDayOf(order.paidAt ?? order.createdAt)]),
        )
        const revenueByDay = new Map<string, { grossCents: number; tickets: number; orders: number }>()
        let eventRevenue = 0
        for (const order of paid) {
          const day = paidDay.get(String(order._id))
          if (!day) continue
          if (previousDays.has(day)) {
            previous.push({ day, grossCents: order.subtotalCents, tickets: 0, orders: 1 })
            continue
          }
          if (!days.includes(day)) continue
          const bucket = revenueByDay.get(day) ?? { grossCents: 0, tickets: 0, orders: 0 }
          bucket.grossCents += order.subtotalCents
          bucket.orders += 1
          revenueByDay.set(day, bucket)
          eventRevenue += order.subtotalCents
        }
        const issued = await ctx.db
          .query("ticketIssued")
          .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
          .take(MAX_TICKETS_PER_EVENT)
        truncated = truncated || issued.length >= MAX_TICKETS_PER_EVENT
        const live = issued.filter((ticket) => ticket.cancelled !== true)
        let eventTickets = 0
        for (const ticket of live) {
          const day = paidDay.get(String(ticket.orderId))
          if (!day) continue
          if (previousDays.has(day)) {
            previous.push({ day, grossCents: 0, tickets: 1, orders: 0 })
            continue
          }
          const bucket = revenueByDay.get(day)
          if (!bucket) continue
          bucket.tickets += 1
          eventTickets += 1
        }
        for (const [day, bucket] of revenueByDay) sales.push({ day, ...bucket })
        const tiers = await ctx.db
          .query("catalogTicketTiers")
          .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
          .collect()
        const eventCapacity = tiers
          .filter((tier) => tier.archivedAt === undefined)
          .reduce((sum, tier) => sum + tier.capacity, 0)
        capacity += eventCapacity
        soldTickets += live.length
        eventRows.push({
          eventKey: event.eventKey,
          title: event.title,
          startsAt: event.startsAt,
          revenueCents: eventRevenue,
          tickets: eventTickets,
          occupancyBps: eventCapacity === 0 ? 0 : Math.round((live.length / eventCapacity) * 10000),
        })
      }
      eventRows.sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))
      const stats = organizerDashboardOverviewStatsCreate({ days, sales, previous, capacity, soldTickets })
      return createResult({ fromDay: startDay, toDay: endDay, ...stats, events: eventRows, truncated })
    }),
})
