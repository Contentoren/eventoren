import { v as convexV } from "convex/values"
import { internalAction } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { envBaseUrlAppResult } from "#src/app/env/public/envBaseUrlAppResult.ts"
import { organizerDashboardTeamDeliveryResolve } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliveryResolve.ts"
import { organizerDashboardTeamEmailSenderCreate } from "#src/organizer/dashboard/team/organizerDashboardTeamEmailSenderCreate.ts"
import { organizerDashboardTeamFunctionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamFunctionReference.ts"
import { organizerDashboardTeamInvitationUrlCreate } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationUrlCreate.ts"
import type { organizerDashboardTeamInvitationDeliveryClaimMutation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationDeliveryClaimMutation.ts"
import type { organizerDashboardTeamInvitationDeliveryRecordMutation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationDeliveryRecordMutation.ts"

const organizerDashboardTeamDeliveryClaimReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInvitationDeliveryClaimMutation
>("organizerDashboardTeam:organizerDashboardTeamInvitationDeliveryClaimMutation")

const organizerDashboardTeamDeliveryRecordReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInvitationDeliveryRecordMutation
>("organizerDashboardTeam:organizerDashboardTeamInvitationDeliveryRecordMutation")

/**
 * Delivers one invitation mail.
 *
 * The action claims the invitation first to coalesce overlapping scheduled
 * work. This is not SMTP exactly-once delivery: a crash after provider handoff
 * can leave an ambiguous `sending` claim, which is never automatically reset.
 * Such claims require manual reconciliation. The state is durable: `sent` only
 * after the mail provider accepted the mail, `failed` with the provider
 * message, `skipped` when no provider is available. Outside production no
 * provider exists, so the mail is honestly reported as not delivered.
 */
export const organizerDashboardTeamInvitationDeliverAction = internalAction({
  args: { invitationId: convexV.id("organizerDashboardTeamInvitations") },
  handler: async (ctx, args): PromiseResult<null> => {
    const op = "organizerDashboardTeamInvitationDeliverAction"
    const claim = await ctx.runMutation(organizerDashboardTeamDeliveryClaimReference, {
      invitationId: args.invitationId,
    })
    if (!claim.success) return claim
    if (claim.data.status === "skipped") return createResult(null)
    const invitation = claim.data

    const sender = organizerDashboardTeamEmailSenderCreate({
      send: async () => {
        const baseUrl = envBaseUrlAppResult()
        if (!baseUrl.success) return createResultError(op, "The application base URL is not configured")
        const url = organizerDashboardTeamInvitationUrlCreate(baseUrl.data, args.invitationId)
        return await ctx.runAction(internal.authEmail.sendAuthEmailInternalAction, {
          kind: "orgInvitation",
          toEmail: invitation.email,
          code: "",
          url,
          language: "de",
          invitedByName: invitation.inviterName,
          ...(invitation.inviterEmail === null ? {} : { invitedByEmail: invitation.inviterEmail }),
          orgName: invitation.orgName,
        })
      },
    })
    const outcome = await organizerDashboardTeamDeliveryResolve({
      sender: sender.sender,
      skippedReason: sender.skippedReason,
    })
    const recorded = await ctx.runMutation(organizerDashboardTeamDeliveryRecordReference, {
      invitationId: args.invitationId,
      attempt: invitation.attempt,
      state: outcome.state,
      ...(outcome.state === "sent" ? {} : { reason: outcome.reason }),
    })
    if (!recorded.success) return recorded
    return createResult(null)
  },
})
