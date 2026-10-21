import { v as convexV } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { OrganizerDashboardTeamDeliveryClaimResult } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliveryClaimResult.ts"
import { organizerDashboardTeamInvitationStatusEffective } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusEffective.ts"

/**
 * Claims one invitation for exactly one delivery attempt.
 *
 * The claim is the deduplication point: an invitation that is already claimed
 * or already delivered is never sent twice, and a closed invitation is marked
 * as skipped instead of staying "queued" forever. The attempt number is
 * returned so that a late result of an older attempt cannot overwrite the
 * state of a newer one.
 */
export const organizerDashboardTeamInvitationDeliveryClaimMutation = internalMutation({
  args: { invitationId: convexV.id("organizerDashboardTeamInvitations") },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardTeamDeliveryClaimResult> => {
    const op = "organizerDashboardTeamInvitationDeliveryClaimMutation"
    const invitation = await ctx.db.get("organizerDashboardTeamInvitations", args.invitationId)
    if (!invitation) return createResultError(op, "Invitation not found")

    const now = new Date()
    const nowIso = now.toISOString()
    const status = organizerDashboardTeamInvitationStatusEffective(invitation, now)
    if (status !== "pending") {
      if (invitation.deliveryState === "queued") {
        await ctx.db.patch("organizerDashboardTeamInvitations", invitation._id, {
          deliveryState: "skipped",
          deliveryReason: `invitation_${status}`,
          updatedAt: nowIso,
        })
      }
      return createResult({ status: "skipped", reason: `invitation_${status}` })
    }
    if (invitation.deliveryState === "sending") {
      return createResult({ status: "skipped", reason: "already_claimed" })
    }
    if (invitation.deliveryState === "sent") {
      return createResult({ status: "skipped", reason: "already_sent" })
    }

    const attempt = invitation.deliveryAttempts + 1
    await ctx.db.patch("organizerDashboardTeamInvitations", invitation._id, {
      deliveryState: "sending",
      deliveryAttempts: attempt,
      deliveryLastAttemptAt: nowIso,
      updatedAt: nowIso,
    })
    const org = await ctx.db.get("orgs", invitation.orgId)
    const inviter = await ctx.db.get("users", invitation.invitedByUserId)
    return createResult({
      status: "claimed",
      attempt,
      email: invitation.invitedEmail,
      organizerRole: invitation.organizerRole,
      orgName: org?.name ?? org?.orgHandle ?? "Organisation",
      inviterName: inviter?.name ?? "Eventoren",
      inviterEmail: inviter?.email ?? null,
    })
  },
})
