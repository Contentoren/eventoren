import type { Id } from "#convex/_generated/dataModel.js"
import type { QueryCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardPricingIsReady } from "#src/organizer/dashboard/pricing/organizerDashboardPricingIsReady.ts"

/**
 * Public checkout gate for organizer-owned events. Unowned legacy events
 * (no orgId) pass unchanged. Owned events require a canonical organization
 * row that is live (status aktiv) with admin-confirmed fee/tax configuration
 * and a settled fee repricing barrier (pricingStatus ready; legacy rows
 * without the optional field count as ready). New and unpaid checkouts are
 * denied while a fee revision is still repricing tiers; paid-order replay
 * stays ungated upstream so snapshots never reprice.
 * Read-only: no external calls, no logging (no PII), no writes.
 */
export async function ticketOrganizerSalesCheck(
  ctx: Pick<QueryCtx, "db">,
  orgId: Id<"orgs"> | undefined,
): PromiseResult<void> {
  const op = "ticketOrganizerSalesCheck"
  if (orgId === undefined) return createResult(undefined)
  const organization = await ctx.db
    .query("organizerDashboardOrganizations")
    .withIndex("orgId", (q) => q.eq("orgId", orgId))
    .unique()
  if (!organization) return createResultError(op, "Ticket sales are not available for this event")
  if (organization.status !== "aktiv")
    return createResultError(op, "Ticket sales are currently suspended for this event")
  if (!organization.configurationConfirmed)
    return createResultError(op, "Ticket sales are not available for this event")
  if (!organizerDashboardPricingIsReady(organization))
    return createResultError(op, "Ticket sales are temporarily unavailable while ticket prices are being updated")
  return createResult(undefined)
}
