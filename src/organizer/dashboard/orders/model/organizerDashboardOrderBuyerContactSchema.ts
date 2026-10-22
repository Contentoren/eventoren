import * as v from "valibot"

/** Optional operational override of the buyer contact; the invoice snapshot stays untouched. */
export const organizerDashboardOrderBuyerContactSchema = v.object({
  givenName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120, "Vorname zu lang (höchstens 120 Zeichen)."))),
  familyName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120, "Nachname zu lang (höchstens 120 Zeichen)."))),
  email: v.optional(
    v.union([
      v.literal(""),
      v.pipe(
        v.string(),
        v.trim(),
        v.maxLength(254, "E-Mail zu lang (höchstens 254 Zeichen)."),
        v.email("Bitte gib eine gültige E-Mail-Adresse ein."),
      ),
    ]),
  ),
  phone: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80, "Telefonnummer zu lang (höchstens 80 Zeichen)."))),
})

export type OrganizerDashboardOrderBuyerContactInput = v.InferOutput<typeof organizerDashboardOrderBuyerContactSchema>
