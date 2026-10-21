import * as v from "valibot"

const id = v.pipe(v.string(), v.trim(), v.nonEmpty())

/**
 * Real completion path: links an already-paid canonical order, then atomically
 * checks in its tickets. No paid state is ever simulated or asserted.
 */
export const organizerDashboardBoxOfficeSaleCompleteSchema = v.strictObject({
  saleId: id,
  orderId: id,
})

export type OrganizerDashboardBoxOfficeSaleComplete = v.InferOutput<
  typeof organizerDashboardBoxOfficeSaleCompleteSchema
>
