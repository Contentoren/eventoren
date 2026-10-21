import * as v from "valibot"
import type { Id } from "#convex/_generated/dataModel.js"
import { orgRoleSchema } from "#src/org/org_model_field/orgRole.ts"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"

/**
 * One row of the organization team list.
 * `role` is the canonical legacy membership role (member/guest) and stays
 * untouched by team management; `organizerRole` is the optional five-role
 * team role and is the only field team management changes.
 */
export const organizerDashboardTeamMemberSchema = v.object({
  id: v.custom<Id<"orgMembers">>((value) => typeof value === "string"),
  userId: v.string(),
  name: v.string(),
  email: v.nullable(v.string()),
  role: orgRoleSchema,
  organizerRole: v.nullable(organizerDashboardRoleSchema),
  invitedBy: v.string(),
  createdAt: v.string(),
})

export type OrganizerDashboardTeamMember = v.InferOutput<typeof organizerDashboardTeamMemberSchema>
