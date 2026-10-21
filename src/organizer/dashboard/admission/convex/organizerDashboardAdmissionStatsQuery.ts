import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import {
  organizerDashboardAdmissionStatsCreate,
  type OrganizerDashboardAdmissionStats,
} from "../model/organizerDashboardAdmissionStatsCreate.ts"
import { organizerDashboardAdmissionScopeGet } from "./organizerDashboardAdmissionScopeGet.ts"

const maxTicketsRead = 5000
const maxScansRead = 2000

/**
 * Live admission stats per ticket type and entrance, including rejected-scan
 * reasons. Entry readers (`einlass.nutzen`) and order readers
 * (`bestellungen.sehen`) share this; purchase data stays in orders.
 */
export const organizerDashboardAdmissionStatsQuery = query({
  args: { orgId: v.id("orgs"), eventKey: v.string(), token: v.string() },
  handler: (ctx, args): PromiseResult<OrganizerDashboardAdmissionStats> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardAdmissionStatsQuery"
      const auth = await organizerDashboardAuthorize(queryCtx, userId, orgId)
      if (!auth.success) return auth
      if (!auth.data.permissions.includes("einlass.nutzen") && !auth.data.permissions.includes("bestellungen.sehen")) {
        return createResultError(op, "Permission denied")
      }
      const scope = await organizerDashboardAdmissionScopeGet(queryCtx, orgId, eventKey, op)
      if (!scope.success) return scope
      const event = scope.data
      const tiers = await queryCtx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id))
        .collect()
      // One paginate() per function only (Convex limit): bounded take() reads.
      const ticketRows = await queryCtx.db
        .query("ticketIssued")
        .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
        .take(maxTicketsRead)
      const tickets = ticketRows.map((ticket) => ({
        tierKey: ticket.tierKey,
        ...(ticket.cancelled === true ? { cancelled: true as const } : {}),
        ...(ticket.checkedInAt !== undefined ? { checkedInAt: ticket.checkedInAt } : {}),
      }))
      const scanRows = await queryCtx.db
        .query("organizerDashboardAdmissionScans")
        .withIndex("eventKeyAndAt", (q) => q.eq("eventKey", eventKey))
        .take(maxScansRead)
      const scans = scanRows.map((scan) => ({ entrance: scan.entrance, result: scan.result }))
      return createResult(
        organizerDashboardAdmissionStatsCreate({
          eventKey,
          tiers: tiers
            .filter((tier) => tier.archivedAt === undefined)
            .map((tier) => ({ tierKey: tier.tierKey, tierName: tier.name, capacity: tier.capacity })),
          tickets,
          scans,
        }),
      )
    }),
})
