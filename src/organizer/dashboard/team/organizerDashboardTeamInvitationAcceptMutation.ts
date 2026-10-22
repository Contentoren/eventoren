import { v as convexV } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardTeamEmailNormalize } from "#src/organizer/dashboard/team/organizerDashboardTeamEmailNormalize.ts"
import { organizerDashboardTeamInvitationStatusEffective } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusEffective.ts"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardTeamRoleGuard } from "#src/organizer/dashboard/team/organizerDashboardTeamRoleGuard.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

/**
 * Accepts one team invitation for the signed-in account.
 *
 * The role and the organization always come from the stored invitation, never
 * from the request. The account e-mail of the signed-in user must match the
 * invited address, the invitation must still be open and unexpired, and the
 * whole grant runs in one transaction: an existing member keeps the canonical
 * membership role (member/guest) and only receives the team role, a new
 * member is created with the canonical `member` role.
 */
export const organizerDashboardTeamInvitationAcceptMutation = mutation({
  args: {
    token: convexV.string(),
    invitationId: convexV.id("organizerDashboardTeamInvitations"),
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    readonly memberId: Id<"orgMembers">
    readonly orgId: Id<"orgs">
    readonly organizerRole: "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass"
  }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, invitationId }) => {
      const op = "organizerDashboardTeamInvitationAcceptMutation"
      const user = await mutationCtx.db.get("users", userId)
      if (!user || user.deletedAt) return createResultError(op, "Konto nicht gefunden.")
      const accountEmail = user.email
      if (!accountEmail) return createResultError(op, "Dein Konto hat keine E-Mail-Adresse hinterlegt.")

      const invitation = await mutationCtx.db.get("organizerDashboardTeamInvitations", invitationId)
      if (!invitation) return createResultError(op, "Einladung nicht gefunden.")
      const now = new Date()
      const status = organizerDashboardTeamInvitationStatusEffective(invitation, now)
      if (status === "expired") return createResultError(op, "Diese Einladung ist abgelaufen.")
      if (invitation.status !== "pending") return createResultError(op, "Diese Einladung ist nicht mehr offen.")
      if (
        organizerDashboardTeamEmailNormalize(invitation.invitedEmail) !==
        organizerDashboardTeamEmailNormalize(accountEmail)
      ) {
        return createResultError(op, "Diese Einladung wurde an eine andere E-Mail-Adresse gesendet.")
      }

      const org = await mutationCtx.db.get("orgs", invitation.orgId)
      if (!org) return createResultError(op, "Organisation nicht gefunden.")
      const organization = await mutationCtx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", invitation.orgId))
        .unique()
      if (!organization) return createResultError(op, "Organisation nicht gefunden.")
      if (organization.status === "gesperrt") return createResultError(op, "Diese Organisation ist gesperrt.")

      const memberships = await mutationCtx.db
        .query("orgMembers")
        .withIndex("userIdOrgId", (q) => q.eq("userId", userId).eq("orgId", invitation.orgId))
        .take(2)
      if (memberships.length > 1)
        return createResultError(op, "Deine Mitgliedschaft ist nicht eindeutig. Bitte wende dich an den Support.")
      const membership = memberships[0]
      // Invitation authority is a live transaction dependency, not a snapshot
      // from creation. Deleted, removed and ambiguous inviters fail closed.
      const inviter = await organizerDashboardAuthorize(
        mutationCtx,
        invitation.invitedByUserId,
        invitation.orgId,
        "team.verwalten",
      )
      if (!inviter.success) return inviter
      const currentRole = membership?.organizerRole ?? null
      if (currentRole !== null && currentRole !== invitation.organizerRole) {
        return createResultError(
          op,
          "Deine bestehende Teamrolle passt nicht zu dieser Einladung; bitte die Teamverwaltung um eine explizite Änderung.",
        )
      }
      const guard = organizerDashboardTeamRoleGuard({
        actorRole: inviter.data.role,
        actorMemberId: inviter.data.membership._id,
        targetMemberId: membership?._id ?? userId,
        targetRole: currentRole,
        nextRole: invitation.organizerRole,
      })
      if (!guard.success) return guard
      const nowIso = now.toISOString()
      let memberId: Id<"orgMembers">
      const grantedRole = invitation.organizerRole

      if (membership) {
        memberId = membership._id
        if (currentRole === null) {
          await mutationCtx.db.patch(membership._id, {
            organizerRole: invitation.organizerRole,
            updatedAt: nowIso,
          })
        }
      } else {
        memberId = await mutationCtx.db.insert("orgMembers", {
          orgId: invitation.orgId,
          userId,
          orgHandle: org.orgHandle,
          role: "member",
          organizerRole: invitation.organizerRole,
          invitedBy: invitation.invitedByUserId,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
      }

      await mutationCtx.db.patch("organizerDashboardTeamInvitations", invitation._id, {
        status: "accepted",
        acceptedAt: nowIso,
        acceptedByUserId: userId,
        updatedAt: nowIso,
      })
      return createResult({ memberId, orgId: invitation.orgId, organizerRole: grantedRole })
    }),
})
