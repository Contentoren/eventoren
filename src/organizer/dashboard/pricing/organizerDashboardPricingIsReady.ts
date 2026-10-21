import type { Doc } from "#convex/_generated/dataModel.js"

/** Legacy rows without the additive barrier field remain ready. */
export function organizerDashboardPricingIsReady(
  organization: Pick<Doc<"organizerDashboardOrganizations">, "pricingStatus">,
): boolean {
  return (organization.pricingStatus ?? "ready") === "ready"
}
