import * as v from "valibot"

/**
 * Explicit demo-harness device payment. Requires testHarness:true AND a sale
 * created with testHarness:true; real sales always reject. Never a paid state.
 */
export const organizerDashboardBoxOfficeSaleTestPaySchema = v.strictObject({
  saleId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte gib eine Vorgangs-ID an.")),
  testHarness: v.literal(true),
})

export type OrganizerDashboardBoxOfficeSaleTestPay = v.InferOutput<typeof organizerDashboardBoxOfficeSaleTestPaySchema>
