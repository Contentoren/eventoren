import * as v from "valibot"

/** Organizer-created box-office sale (Kassenvorgang). Price/contingent set by organizer. */
export const organizerDashboardBoxOfficeSaleCreateSchema = v.strictObject({
  eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  tierKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  quantity: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)),
  unitPriceCents: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  buyerEmail: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(320), v.email("Gültige E-Mail angeben"))),
  /** Explicit demo-harness marker: only test sales accept the simulated device payment. */
  testHarness: v.optional(v.boolean()),
})

export type OrganizerDashboardBoxOfficeSaleCreate = v.InferOutput<typeof organizerDashboardBoxOfficeSaleCreateSchema>
