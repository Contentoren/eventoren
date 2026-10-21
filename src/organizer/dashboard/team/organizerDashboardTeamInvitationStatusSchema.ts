import * as v from "valibot"

/** Lifecycle of a team invitation. `pending` is the only state that can be accepted. */
export const organizerDashboardTeamInvitationStatusSchema = v.picklist(["pending", "accepted", "revoked", "expired"])

export type OrganizerDashboardTeamInvitationStatus = v.InferOutput<typeof organizerDashboardTeamInvitationStatusSchema>
