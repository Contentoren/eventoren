import * as v from "valibot"

/** Guest-list quota (Kontingent): named pool with a seat limit per event. */
export const organizerDashboardGuestQuotaSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Name fehlt"),
    v.maxLength(120, "Name zu lang (höchstens 120 Zeichen)."),
  ),
  limit: v.pipe(
    v.number(),
    v.integer("Das Limit muss eine ganze Zahl sein."),
    v.minValue(1, "Limit muss mindestens 1 sein"),
    v.maxValue(100000, "Limit zu hoch (höchstens 100000)."),
  ),
})

export type OrganizerDashboardGuestQuotaInput = v.InferInput<typeof organizerDashboardGuestQuotaSchema>

/** One guest-list entry. plusOnes counts companions (0–5); 1 + plusOnes seats. */
export const organizerDashboardGuestSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Name fehlt"),
    v.maxLength(240, "Name zu lang (höchstens 240 Zeichen)."),
  ),
  email: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.email("Bitte gib eine gültige E-Mail-Adresse ein."),
      v.maxLength(254, "E-Mail zu lang (höchstens 254 Zeichen)."),
    ),
  ),
  plusOnes: v.pipe(
    v.number(),
    v.integer("Die Begleitpersonenanzahl muss eine ganze Zahl sein."),
    v.minValue(0, "Die Begleitpersonenanzahl darf nicht negativ sein."),
    v.maxValue(5, "Höchstens 5 Begleitpersonen erlaubt."),
  ),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000, "Notiz zu lang (höchstens 1000 Zeichen)."))),
})

export type OrganizerDashboardGuestInput = v.InferInput<typeof organizerDashboardGuestSchema>

export function organizerDashboardGuestSeatsOf(plusOnes: number): number {
  return 1 + plusOnes
}
