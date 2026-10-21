import type { DatabaseReader } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { organizerDashboardAdmissionScopeGet } from "../../admission/convex/organizerDashboardAdmissionScopeGet.ts"

/** Loads the tier and verifies it belongs to the authorized org event. */
export async function organizerDashboardBoxOfficeTierGet(
  ctx: { db: DatabaseReader },
  orgId: Id<"orgs">,
  eventKey: string,
  tierKey: string,
  op: string,
) {
  const scope = await organizerDashboardAdmissionScopeGet(ctx, orgId, eventKey, op)
  if (!scope.success) return scope
  const tier = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", scope.data._id).eq("tierKey", tierKey))
    .unique()
  if (!tier || tier.archivedAt !== undefined) return createResultError(op, "Ticketart nicht verfügbar")
  return createResult({ event: scope.data, tier })
}
