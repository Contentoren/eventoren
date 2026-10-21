import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import * as v from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardTeamMemberCreate } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberCreate.ts"
import type { OrganizerDashboardTeamMember } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberSchema.ts"
import { organizerDashboardTeamOwnerProbe } from "#src/organizer/dashboard/team/organizerDashboardTeamOwnerProbe.ts"
import { organizerDashboardTeamRoleGuard } from "#src/organizer/dashboard/team/organizerDashboardTeamRoleGuard.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

/**
 * Changes the team role of one member.
 *
 * `organizerRole: null` removes the team role and keeps the canonical
 * membership (member/guest, invitedBy) untouched. Granting, changing or
 * removing the owner role is reserved for the current owner, nobody can
 * escalate their own role, and the last owner cannot be demoted.
 */
export const organizerDashboardTeamRoleUpdateMutation = mutation({
  args: {
    token: convexV.string(),
    orgId: convexV.id("orgs"),
    memberId: convexV.id("orgMembers"),
    organizerRole: convexV.union(convexV.null(), convexV.string()),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardTeamMember> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, memberId, organizerRole }) => {
      const op = "organizerDashboardTeamRoleUpdateMutation"
      const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "team.verwalten")
      if (!authorization.success) return authorization

      let nextRole: "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass" | null = null
      if (organizerRole !== null) {
        const parsed = v.safeParse(organizerDashboardRoleSchema, organizerRole)
        if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
        nextRole = parsed.output
      }

      const member = await mutationCtx.db.get("orgMembers", memberId)
      if (!member) return createResultError(op, "Member not found")
      if (member.orgId !== orgId) return createResultError(op, "Member does not belong to this organization")

      const guard = organizerDashboardTeamRoleGuard({
        actorRole: authorization.data.role,
        actorMemberId: authorization.data.membership._id,
        targetMemberId: member._id,
        targetRole: member.organizerRole ?? null,
        nextRole,
      })
      if (!guard.success) return guard

      if (member.organizerRole === "inhaber" && nextRole !== "inhaber") {
        const probe = await organizerDashboardTeamOwnerProbe(mutationCtx, orgId, member._id)
        if (probe.budgetExhausted)
          return createResultError(
            op,
            "Owner safety check exceeded its 100-candidate budget; resolve stale owner memberships first",
          )
        if (!probe.anotherOwnerExists) {
          return createResultError(op, "The last owner cannot be demoted; grant the owner role to someone else first")
        }
      }

      await mutationCtx.db.patch(member._id, {
        ...(nextRole === null ? { organizerRole: undefined } : { organizerRole: nextRole }),
        updatedAt: new Date().toISOString(),
      })
      const updated = await mutationCtx.db.get("orgMembers", member._id)
      if (!updated) return createResultError(op, "Member not found after the role change")
      return createResult(await organizerDashboardTeamMemberCreate(mutationCtx, updated))
    }),
})
