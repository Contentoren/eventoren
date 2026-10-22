import * as v from "valibot"

/** Holder rename of an issued ticket; never an entitlement or ownership transfer. */
export const organizerDashboardOrderParticipantUpdateSchema = v.object({
  participantName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(240, "Name zu lang (höchstens 240 Zeichen)."))),
  participantEmail: v.optional(
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
})

export type OrganizerDashboardOrderParticipantUpdate = v.InferOutput<
  typeof organizerDashboardOrderParticipantUpdateSchema
>
