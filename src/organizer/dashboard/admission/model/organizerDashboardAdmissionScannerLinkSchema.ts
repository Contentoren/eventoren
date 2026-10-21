import * as v from "valibot"

/** Dashboard-created helper scanner link. Expiry is a ms epoch, max one year out. */
export const organizerDashboardAdmissionScannerLinkSchema = v.strictObject({
  eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  label: v.pipe(v.string(), v.trim(), v.minLength(1, "Name angeben"), v.maxLength(120, "Name ist zu lang")),
  entrance: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(60))),
  expiresAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export type OrganizerDashboardAdmissionScannerLink = v.InferOutput<typeof organizerDashboardAdmissionScannerLinkSchema>
