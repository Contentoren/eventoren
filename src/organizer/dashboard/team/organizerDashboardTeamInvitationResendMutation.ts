import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardTeamDeliverActionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliverActionReference.ts"
import type { OrganizerDashboardTeamInvitation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationSchema.ts"
import { organizerDashboardTeamInvitationStatusEffective } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusEffective.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

/**
 * Queues a new delivery attempt for one open team invitation.
 *
 * The invitation itself is reused, so a resend never creates a second
 * invitation. An in-flight `sending` claim is never reset, including an
 * abandoned/ambiguous SMTP outcome: it requires manual reconciliation, not
 * automatic retry. Queued work is coalesced; completed attempts can be retried
 * explicitly. This is claim deduplication, NOT SMTP exactly-once delivery.
 */
export const organizerDashboardTeamInvitationResendMutation = mutation({
  args: {
    token: convexV.string(),
    orgId: convexV.id("orgs"),
    invitationId: convexV.id("organizerDashboardTeamInvitations"),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardTeamInvitation> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, invitationId }) => {
      const op = "organizerDashboardTeamInvitationResendMutation"
      const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "team.verwalten")
      if (!authorization.success) return authorization

      const invitation = await mutationCtx.db.get("organizerDashboardTeamInvitations", invitationId)
      if (!invitation) return createResultError(op, "Einladung nicht gefunden.")
      if (invitation.orgId !== orgId)
        return createResultError(op, "Diese Einladung gehört nicht zu dieser Organisation.")
      const status = organizerDashboardTeamInvitationStatusEffective(invitation, new Date())
      if (status !== "pending") return createResultError(op, "Diese Einladung ist nicht mehr offen.")

      if (invitation.deliveryState === "sending") {
        return createResultError(
          op,
          "Der Versand läuft bereits oder sein Ergebnis ist unbekannt; bitte wende dich an den Support.",
        )
      }
      if (invitation.deliveryState === "queued") {
        return createResultError(op, "Der Versand ist bereits angestoßen.")
      }

      const nowIso = new Date().toISOString()
      await mutationCtx.db.patch("organizerDashboardTeamInvitations", invitation._id, {
        deliveryState: "queued",
        deliveryReason: undefined,
        updatedAt: nowIso,
      })
      await mutationCtx.scheduler.runAfter(0, organizerDashboardTeamDeliverActionReference, { invitationId })
      const updated = await mutationCtx.db.get("organizerDashboardTeamInvitations", invitation._id)
      if (!updated)
        return createResultError(op, "Einladung wurde erneut angestoßen, konnte aber nicht erneut geladen werden.")
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
