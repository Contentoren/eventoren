import * as v from "valibot"

/** Holder rename of an issued ticket; never an entitlement or ownership transfer. */
export const organizerDashboardOrderParticipantUpdateSchema = v.object({
  participantName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(240))),
  participantEmail: v.optional(v.union([v.literal(""), v.pipe(v.string(), v.trim(), v.maxLength(254), v.email())])),
})

export type OrganizerDashboardOrderParticipantUpdate = v.InferOutput<
  typeof organizerDashboardOrderParticipantUpdateSchema
>
