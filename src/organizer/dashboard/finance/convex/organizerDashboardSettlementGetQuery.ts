import * as a from "valibot"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardSettlementFilterSchema } from "../organizerDashboardFinanceFilterSchema.ts"
import { organizerDashboardFinanceEventScopeGet } from "./organizerDashboardFinanceEventScopeGet.ts"
import { organizerDashboardFinanceEventStatsRead } from "./organizerDashboardFinanceEventStatsRead.ts"

export type OrganizerDashboardSettlement = {
  eventKey: string
  title: string
  startsAt: string
  endsAt: string
  status: string
  venue: string
  city: string
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
  truncated: boolean
}

/** Per-event settlement (Abrechnung): gross, fees, disputes, payout, recorded payouts. */
export const organizerDashboardSettlementGetQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), eventKey: v.string() },
  handler: (ctx, args): PromiseResult<OrganizerDashboardSettlement> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardSettlementGetQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "finanzen.sehen")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardSettlementFilterSchema, { orgId: String(orgId), eventKey })
      if (!filters.success) return createResultError(op, filters.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const scope = await organizerDashboardFinanceEventScopeGet(ctx, orgId, filters.output.eventKey, op)
      if (!scope.success) return scope
      const stats = await organizerDashboardFinanceEventStatsRead(ctx, orgId, scope.data.event)
      const { event } = stats
      return createResult({
        eventKey: event.eventKey,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        status: event.status,
        venue: event.venue,
        city: event.city,
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
        truncated: stats.truncated,
      })
    }),
})
