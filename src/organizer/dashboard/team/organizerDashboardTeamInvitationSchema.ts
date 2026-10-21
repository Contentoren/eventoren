import * as v from "valibot"
import type { Id } from "#convex/_generated/dataModel.js"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardTeamDeliveryStateSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliveryStateSchema.ts"
import { organizerDashboardTeamInvitationStatusSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusSchema.ts"

/**
 * One row of the pending team invitations list.
 * `deliveryState` is the honest delivery state of the mail; `deliveryReason`
 * explains `failed` and `skipped` (for example "no mail provider available").
 */
export const organizerDashboardTeamInvitationSchema = v.object({
  id: v.custom<Id<"organizerDashboardTeamInvitations">>((value) => typeof value === "string"),
  orgId: v.string(),
  orgName: v.string(),
  invitedEmail: v.string(),
  organizerRole: organizerDashboardRoleSchema,
  status: organizerDashboardTeamInvitationStatusSchema,
  deliveryState: organizerDashboardTeamDeliveryStateSchema,
  deliveryAttempts: v.number(),
  deliveryReason: v.nullable(v.string()),
  expiresAt: v.string(),
  createdAt: v.string(),
})

export type OrganizerDashboardTeamInvitation = v.InferOutput<typeof organizerDashboardTeamInvitationSchema>
