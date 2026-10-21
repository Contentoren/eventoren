import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardTeamDeliveryStateSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliveryStateSchema.ts"
import { organizerDashboardTeamInvitationStatusSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusSchema.ts"
import { valibotFieldToConvexValidator, valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"

/**
 * Team invitations of the organizer dashboard.
 *
 * The table is owned by the dashboard team context and is registered in
 * `convex/schema.ts` (parent integration step):
 * `import { organizerDashboardTeamTables } from "#src/organizer/dashboard/team/organizerDashboardTeamTables.ts"`.
 *
 * Invitations are bound to one organization and one intended e-mail address.
 * `invitedEmail` is indexed so the authenticated inbox of the invited account
 * can be answered without scanning, `orgIdAndStatus` serves the manager list
 * and `orgIdAndInvitedEmailAndStatusAndExpiresAt` probes live pending invites
 * independently of closed audit history. Expired pending rows are cleaned in
 * bounded batches; the expiry range means they cannot block new invitations.
 */
export const organizerDashboardTeamTables = {
  organizerDashboardTeamInvitations: defineTable({
    orgId: vIdOrg,
    invitedEmail: v.string(),
    organizerRole: valibotFieldToConvexValidator(organizerDashboardRoleSchema),
    status: valibotFieldToConvexValidator(organizerDashboardTeamInvitationStatusSchema),
    invitedByUserId: v.id("users"),
    expiresAt: v.string(),
    acceptedAt: v.optional(v.string()),
    acceptedByUserId: v.optional(v.id("users")),
    revokedAt: v.optional(v.string()),
    deliveryState: valibotFieldToConvexValidator(organizerDashboardTeamDeliveryStateSchema),
    deliveryAttempts: v.number(),
    deliveryLastAttemptAt: v.optional(v.string()),
    deliveryReason: v.optional(v.string()),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("orgId", ["orgId"])
    .index("orgIdAndStatus", ["orgId", "status"])
    .index("orgIdAndInvitedEmail", ["orgId", "invitedEmail"])
    .index("orgIdAndInvitedEmailAndStatusAndExpiresAt", ["orgId", "invitedEmail", "status", "expiresAt"])
    .index("invitedEmail", ["invitedEmail"]),
} as const
