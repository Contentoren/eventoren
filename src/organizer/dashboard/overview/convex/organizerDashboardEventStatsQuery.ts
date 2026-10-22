import { v } from "convex/values"
import * as a from "valibot"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import {
  organizerDashboardBerlinDayOf,
  organizerDashboardBerlinToday,
} from "#src/organizer/dashboard/finance/organizerDashboardBerlinDay.ts"
import { organizerDashboardFinanceEventScopeGet } from "#src/organizer/dashboard/finance/convex/organizerDashboardFinanceEventScopeGet.ts"
import { organizerDashboardEventStatsFilterSchema } from "#src/organizer/dashboard/overview/organizerDashboardEventStatsFilterSchema.ts"

export type OrganizerDashboardEventTierRow = {
  tierKey: string
  name: string
  sold: number
  checkedIn: number
  capacity: number
  revenueCents: number
}

export type OrganizerDashboardEventStats = {
  eventKey: string
  title: string
  startsAt: string
  status: string
  revenueCents: number
  tickets: number
  checkedIn: number
  capacity: number
  occupancyBps: number
  orders: number
  byTier: OrganizerDashboardEventTierRow[]
  salesCurve: readonly { day: string; revenueCents: number; tickets: number }[]
}

const MAX_ORDERS = 5000
const MAX_TICKETS = 20000

/**
 * Per-event KPIs from live orders, issued tickets and tiers: revenue,
 * tickets, occupancy, check-ins, per-tier rows and a 30-day Berlin sales
 * curve. Permission umsatz.sehen.
 */
export const organizerDashboardEventStatsQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardEventStats> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardEventStatsQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "umsatz.sehen")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardEventStatsFilterSchema, {
        orgId: String(orgId),
        eventKey,
      })
      if (!filters.success) return createResultError(op, filters.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const scope = await organizerDashboardFinanceEventScopeGet(ctx, orgId, filters.output.eventKey, op)
      if (!scope.success) return scope
      const event = scope.data.event
      if (event.deletedAt) return createResultError(op, "Veranstaltung nicht verfügbar")

      const orders = await ctx.db
        .query("ticketOrders")
        .withIndex("orgIdAndEventKeyAndCreatedAt", (q) => q.eq("orgId", orgId).eq("eventKey", event.eventKey))
        .take(MAX_ORDERS)
      const paid = orders.filter((order) => order.status === "paid" && order.orgId === orgId)
      const revenueCents = paid.reduce((sum, order) => sum + order.subtotalCents, 0)

      const issued = await ctx.db
        .query("ticketIssued")
        .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
        .take(MAX_TICKETS)
      const live = issued.filter((ticket) => ticket.cancelled !== true)
      const checkedIn = live.filter((ticket) => ticket.checkedInAt !== undefined).length

      const tiers = await ctx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
        .collect()
      const activeTiers = tiers.filter((tier) => tier.archivedAt === undefined)
      const capacity = activeTiers.reduce((sum, tier) => sum + tier.capacity, 0)
      const byTier: OrganizerDashboardEventTierRow[] = activeTiers.map((tier) => {
        const tierTickets = live.filter((ticket) => ticket.tierKey === tier.tierKey)
        return {
          tierKey: tier.tierKey,
          name: tier.name,
          sold: tierTickets.length,
          checkedIn: tierTickets.filter((ticket) => ticket.checkedInAt !== undefined).length,
          capacity: tier.capacity,
          revenueCents: tierTickets.reduce((sum, ticket) => sum + ticket.priceCents, 0),
        }
      })

      const today = organizerDashboardBerlinToday(new Date().toISOString())
      const start = new Date(Date.parse(`${today}T12:00:00.000Z`) - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const curve = new Map<string, { revenueCents: number; tickets: number }>()
      {
        let cursor = Date.parse(`${start}T12:00:00.000Z`)
        const end = Date.parse(`${today}T12:00:00.000Z`)
        while (cursor <= end) {
          const day = organizerDashboardBerlinDayOf(new Date(cursor).toISOString()) ?? ""
          if (day && !curve.has(day)) curve.set(day, { revenueCents: 0, tickets: 0 })
          cursor += 24 * 60 * 60 * 1000
        }
      }
      const paidDay = new Map(
        paid.map((order) => [String(order._id), organizerDashboardBerlinDayOf(order.paidAt ?? order.createdAt)]),
      )
      for (const order of paid) {
        const day = paidDay.get(String(order._id))
        const bucket = day ? curve.get(day) : undefined
        if (!bucket) continue
        bucket.revenueCents += order.subtotalCents
      }
      for (const ticket of live) {
        const day = paidDay.get(String(ticket.orderId))
        const bucket = day ? curve.get(day) : undefined
        if (!bucket) continue
        bucket.tickets += 1
      }

      return createResult({
        eventKey: event.eventKey,
        title: event.title,
        startsAt: event.startsAt,
        status: event.status,
        revenueCents,
        tickets: live.length,
        checkedIn,
        capacity,
        occupancyBps: capacity === 0 ? 0 : Math.round((live.length / capacity) * 10000),
        orders: paid.length,
        byTier,
        salesCurve: [...curve].map(([day, bucket]) => ({ day, ...bucket })),
      })
    }),
})
