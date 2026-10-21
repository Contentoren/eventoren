import * as v from "valibot"

/** Tax status and default ticket rate are independent; § 19 suppresses tax display, not the rate selection. */
export const organizerDashboardOrganizationTaxSchema = v.strictObject({
  status: v.picklist(["regel", "klein"]),
  defaultRateBps: v.union([v.literal(1900), v.literal(700)]),
})

export type OrganizerDashboardOrganizationTax = v.InferOutput<typeof organizerDashboardOrganizationTaxSchema>
