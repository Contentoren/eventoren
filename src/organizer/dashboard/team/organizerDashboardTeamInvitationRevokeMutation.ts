import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import type { OrganizerDashboardTeamInvitation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

/**
 * Revokes one open team invitation.
 * Requires `team.verwalten` for the organization of the invitation; an
 * invitation of another organization is never touched.
 */
export const organizerDashboardTeamInvitationRevokeMutation = mutation({
  args: {
    token: convexV.string(),
    orgId: convexV.id("orgs"),
    invitationId: convexV.id("organizerDashboardTeamInvitations"),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardTeamInvitation> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, invitationId }) => {
      const op = "organizerDashboardTeamInvitationRevokeMutation"
      const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "team.verwalten")
      if (!authorization.success) return authorization

      const invitation = await mutationCtx.db.get("organizerDashboardTeamInvitations", invitationId)
      if (!invitation) return createResultError(op, "Invitation not found")
      if (invitation.orgId !== orgId) return createResultError(op, "Invitation does not belong to this organization")
      if (invitation.status !== "pending") {
        return createResultError(op, `The invitation is already ${invitation.status}`)
      }

      const nowIso = new Date().toISOString()
      await mutationCtx.db.patch("organizerDashboardTeamInvitations", invitation._id, {
        status: "revoked",
        revokedAt: nowIso,
        updatedAt: nowIso,
      })
      const updated = await mutationCtx.db.get("organizerDashboardTeamInvitations", invitation._id)
      if (!updated) return createResultError(op, "Invitation not found after the revocation")
      const org = await mutationCtx.db.get("orgs", orgId)
      return createResult({
        id: updated._id,
        orgId: updated.orgId,
        orgName: org?.name ?? org?.orgHandle ?? "Organisation",
        invitedEmail: updated.invitedEmail,
        organizerRole: updated.organizerRole,
        status: updated.status,
        deliveryState: updated.deliveryState,
        deliveryAttempts: updated.deliveryAttempts,
        deliveryReason: updated.deliveryReason ?? null,
        expiresAt: updated.expiresAt,
        createdAt: updated.createdAt,
      })
    }),
})
