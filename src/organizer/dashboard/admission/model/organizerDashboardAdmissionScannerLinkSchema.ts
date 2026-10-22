import * as v from "valibot"

/** Dashboard-created helper scanner link. Expiry is a ms epoch, max one year out. */
export const organizerDashboardAdmissionScannerLinkSchema = v.strictObject({
  eventKey: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Ein Veranstaltungsschlüssel ist erforderlich."),
    v.maxLength(200, "Veranstaltungsschlüssel zu lang."),
  ),
  label: v.pipe(v.string(), v.trim(), v.minLength(1, "Name angeben"), v.maxLength(120, "Name ist zu lang")),
  entrance: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "Eingang angeben"),
      v.maxLength(60, "Eingang ist zu lang (höchstens 60 Zeichen)."),
    ),
  ),
  expiresAt: v.pipe(
    v.number(),
    v.integer("Der Ablaufzeitpunkt muss eine ganze Zahl sein."),
    v.minValue(1, "Der Ablaufzeitpunkt muss in der Zukunft liegen."),
  ),
})

export type OrganizerDashboardAdmissionScannerLink = v.InferOutput<typeof organizerDashboardAdmissionScannerLinkSchema>
