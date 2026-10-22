import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardTeamMemberCreate } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberCreate.ts"
import type { OrganizerDashboardTeamMember } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberSchema.ts"
import { organizerDashboardTeamOwnerProbe } from "#src/organizer/dashboard/team/organizerDashboardTeamOwnerProbe.ts"
import { organizerDashboardTeamRoleGuard } from "#src/organizer/dashboard/team/organizerDashboardTeamRoleGuard.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

/**
 * Removes one member from the team.
 *
 * Only the team role is removed: the canonical membership (member/guest) and
 * `invitedBy` stay untouched, so an ordinary member keeps all permissions the
 * membership grants. Removing the owner role is reserved for the current
 * owner and the last owner cannot be removed.
 */
export const organizerDashboardTeamMemberRemoveMutation = mutation({
  args: {
    token: convexV.string(),
    orgId: convexV.id("orgs"),
    memberId: convexV.id("orgMembers"),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardTeamMember> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, memberId }) => {
      const op = "organizerDashboardTeamMemberRemoveMutation"
      const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "team.verwalten")
      if (!authorization.success) return authorization

      const member = await mutationCtx.db.get("orgMembers", memberId)
      if (!member) return createResultError(op, "Mitglied nicht gefunden.")
      if (member.orgId !== orgId) return createResultError(op, "Dieses Mitglied gehört nicht zu dieser Organisation.")
      if (!member.organizerRole) return createResultError(op, "Dieses Mitglied hat keine Teamrolle.")

      const guard = organizerDashboardTeamRoleGuard({
        actorRole: authorization.data.role,
        actorMemberId: authorization.data.membership._id,
        targetMemberId: member._id,
        targetRole: member.organizerRole,
        nextRole: null,
      })
      if (!guard.success) return guard

      if (member.organizerRole === "inhaber") {
        const probe = await organizerDashboardTeamOwnerProbe(mutationCtx, orgId, member._id)
        if (probe.budgetExhausted)
          return createResultError(op, "Sicherheitsprüfung abgebrochen; bitte wende dich an den Support.")
        if (!probe.anotherOwnerExists) {
          return createResultError(
            op,
            "Die letzte Inhaberin bzw. der letzte Inhaber kann nicht entfernt werden; übertrage die Inhaberrolle zuerst auf eine andere Person.",
          )
        }
      }

      await mutationCtx.db.patch(member._id, {
        organizerRole: undefined,
        updatedAt: new Date().toISOString(),
      })
      const updated = await mutationCtx.db.get("orgMembers", member._id)
      if (!updated) return createResultError(op, "Mitglied wurde entfernt, konnte aber nicht erneut geladen werden.")
      return createResult(await organizerDashboardTeamMemberCreate(mutationCtx, updated))
    }),
})
