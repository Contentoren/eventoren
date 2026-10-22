import * as a from "valibot"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardFinanceOverviewFilterSchema } from "../organizerDashboardFinanceFilterSchema.ts"
import {
  organizerDashboardBerlinDayRangeCreate,
  organizerDashboardBerlinToday,
} from "../organizerDashboardBerlinDay.ts"
import { organizerDashboardFinanceEventScopeGet } from "./organizerDashboardFinanceEventScopeGet.ts"
import { organizerDashboardFinanceEventStatsRead } from "./organizerDashboardFinanceEventStatsRead.ts"

export type OrganizerDashboardFinanceEventRow = {
  eventKey: string
  title: string
  startsAt: string
  status: string
  paidOrders: number
  tickets: number
  checkedIn: number
  capacity: number
  grossCents: number
  feeCents: number
  disputeCents: number
  payoutCents: number
  recordedPayoutsCents: number
  remainingPayoutCents: number
}

export type OrganizerDashboardFinanceOverview = {
  paidOrders: number
  tickets: number
  checkedIn: number
  grossCents: number
  feeCents: number
  disputeCents: number
  payoutCents: number
  fromDay: string
  toDay: string
  events: OrganizerDashboardFinanceEventRow[]
  salesCurve: { day: string; grossCents: number; tickets: number }[]
  truncated: boolean
}

export const organizerDashboardFinanceOverviewQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.optional(v.string()),
    fromDay: v.optional(v.string()),
    toDay: v.optional(v.string()),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardFinanceOverview> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, fromDay, toDay }) => {
      const op = "organizerDashboardFinanceOverviewQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "umsatz.sehen")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardFinanceOverviewFilterSchema, {
        orgId: String(orgId),
        ...(eventKey !== undefined ? { eventKey } : {}),
        ...(fromDay !== undefined ? { fromDay } : {}),
        ...(toDay !== undefined ? { toDay } : {}),
      })
      if (!filters.success) return createResultError(op, filters.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const nowIso = new Date().toISOString()
      const endDay = filters.output.toDay ?? organizerDashboardBerlinToday(nowIso)
      const startDay =
        filters.output.fromDay ??
        (() => {
          const end = Date.parse(`${endDay}T12:00:00.000Z`)
          if (Number.isNaN(end)) return endDay
          return new Date(end - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        })()
      const range = organizerDashboardBerlinDayRangeCreate(startDay, endDay)
      if (!range.success) return createResultError(op, range.errorMessage)
      const days = range.days

      const events =
        eventKey === undefined
          ? await ctx.db
              .query("catalogEvents")
              .withIndex("orgId", (q) => q.eq("orgId", orgId))
              .collect()
          : await organizerDashboardFinanceEventScopeGet(ctx, orgId, eventKey, op).then((scope) => {
              if (!scope.success) return null
              return [scope.data.event]
            })
      if (events === null) return createResultError(op, "Veranstaltung nicht verfügbar")

      const rows: OrganizerDashboardFinanceEventRow[] = []
      const totals = {
        paidOrders: 0,
        tickets: 0,
        checkedIn: 0,
        grossCents: 0,
        feeCents: 0,
        disputeCents: 0,
        payoutCents: 0,
      }
      let truncated = false
      const curve = new Map(days.map((day) => [day, { grossCents: 0, tickets: 0 }]))
      for (const event of events) {
        if (!event || event.deletedAt) continue
        const stats = await organizerDashboardFinanceEventStatsRead(ctx, orgId, event)
        truncated = truncated || stats.truncated
        totals.paidOrders += stats.paidOrders
        totals.tickets += stats.tickets
        totals.checkedIn += stats.checkedIn
        totals.grossCents += stats.grossCents
        totals.feeCents += stats.feeCents
        totals.disputeCents += stats.disputeCents
        totals.payoutCents += stats.payoutCents
        for (const [day, bucket] of stats.salesByDay) {
          const target = curve.get(day)
          if (target) {
            target.grossCents += bucket.grossCents
            target.tickets += bucket.tickets
          }
        }
        rows.push({
          eventKey: event.eventKey,
          title: event.title,
          startsAt: event.startsAt,
          status: event.status,
          paidOrders: stats.paidOrders,
          tickets: stats.tickets,
          checkedIn: stats.checkedIn,
          capacity: stats.capacity,
          grossCents: stats.grossCents,
          feeCents: stats.feeCents,
          disputeCents: stats.disputeCents,
          payoutCents: stats.payoutCents,
          recordedPayoutsCents: stats.recordedPayoutsCents,
          remainingPayoutCents: stats.remainingPayoutCents,
        })
      }
      rows.sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))
      return createResult({
        ...totals,
        fromDay: startDay,
        toDay: endDay,
        events: rows,
        salesCurve: days.map((day) => ({ day, ...curve.get(day)! })),
        truncated,
      })
    }),
})
