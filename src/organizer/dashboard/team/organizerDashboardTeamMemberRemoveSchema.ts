import * as v from "valibot"

/** Removal of one team member (removes the team role, keeps the membership). */
export const organizerDashboardTeamMemberRemoveSchema = v.object({
  memberId: v.string(),
})

export type OrganizerDashboardTeamMemberRemove = v.InferOutput<typeof organizerDashboardTeamMemberRemoveSchema>
