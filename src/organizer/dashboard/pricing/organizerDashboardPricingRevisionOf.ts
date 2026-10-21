import type { Doc } from "#convex/_generated/dataModel.js"

export function organizerDashboardPricingRevisionOf(
  organization: Pick<Doc<"organizerDashboardOrganizations">, "feeRevision">,
): number {
  return organization.feeRevision ?? 0
}
