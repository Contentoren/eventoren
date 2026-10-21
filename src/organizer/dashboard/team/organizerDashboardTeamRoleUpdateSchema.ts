import * as v from "valibot"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"

/**
 * Role change of one team member. `organizerRole: null` removes the team role
 * and keeps the canonical membership (member/guest) untouched.
 */
export const organizerDashboardTeamRoleUpdateSchema = v.object({
  memberId: v.string(),
  organizerRole: v.nullable(organizerDashboardRoleSchema),
})

export type OrganizerDashboardTeamRoleUpdate = v.InferOutput<typeof organizerDashboardTeamRoleUpdateSchema>
