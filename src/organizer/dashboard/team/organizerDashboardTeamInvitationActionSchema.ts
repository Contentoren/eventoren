import * as v from "valibot"

/** Target of an invitation action (revoke or resend). */
export const organizerDashboardTeamInvitationActionSchema = v.object({
  invitationId: v.string(),
})

export type OrganizerDashboardTeamInvitationAction = v.InferOutput<typeof organizerDashboardTeamInvitationActionSchema>
