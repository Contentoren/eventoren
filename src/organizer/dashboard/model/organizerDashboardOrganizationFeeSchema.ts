import * as v from "valibot"

/**
 * Canonical fee configuration. All money is integer minor units:
 * percentBps is bounded 0..10000, fixedCents is >= 0, never floating percent.
 */
export const organizerDashboardOrganizationFeeSchema = v.strictObject({
  percentBps: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(10000)),
  fixedCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
  payer: v.picklist(["kaeufer", "veranstalter"]),
})

export type OrganizerDashboardOrganizationFee = v.InferOutput<typeof organizerDashboardOrganizationFeeSchema>
