import * as v from "valibot"

/** Guest-list quota (Kontingent): named pool with a seat limit per event. */
export const organizerDashboardGuestQuotaSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "Name fehlt"), v.maxLength(120, "Name zu lang")),
  limit: v.pipe(v.number(), v.integer(), v.minValue(1, "Limit muss mindestens 1 sein"), v.maxValue(100000)),
})

export type OrganizerDashboardGuestQuotaInput = v.InferInput<typeof organizerDashboardGuestQuotaSchema>

/** One guest-list entry. plusOnes counts companions (0–5); 1 + plusOnes seats. */
export const organizerDashboardGuestSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "Name fehlt"), v.maxLength(240, "Name zu lang")),
  email: v.optional(v.pipe(v.string(), v.trim(), v.email("Keine gültige E-Mail"), v.maxLength(254))),
  plusOnes: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(5)),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000, "Notiz zu lang"))),
})

export type OrganizerDashboardGuestInput = v.InferInput<typeof organizerDashboardGuestSchema>

export function organizerDashboardGuestSeatsOf(plusOnes: number): number {
  return 1 + plusOnes
}
