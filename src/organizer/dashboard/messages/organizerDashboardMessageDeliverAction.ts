import { v as convexV } from "convex/values"
import { internalAction } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { organizerDashboardTeamDeliveryResolve } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliveryResolve.ts"
import { organizerDashboardMessageFunctionReference } from "#src/organizer/dashboard/messages/organizerDashboardMessageFunctionReference.ts"
import type { organizerDashboardMessageDeliveryClaimMutation } from "#src/organizer/dashboard/messages/convex/organizerDashboardMessageDeliveryClaimMutation.ts"
import type { organizerDashboardMessageDeliveryRecordMutation } from "#src/organizer/dashboard/messages/convex/organizerDashboardMessageDeliveryRecordMutation.ts"

const organizerDashboardMessageDeliveryClaimReference = organizerDashboardMessageFunctionReference<
  typeof organizerDashboardMessageDeliveryClaimMutation
>("organizerDashboardMessages:organizerDashboardMessageDeliveryClaimMutation")

const organizerDashboardMessageDeliveryRecordReference = organizerDashboardMessageFunctionReference<
  typeof organizerDashboardMessageDeliveryRecordMutation
>("organizerDashboardMessages:organizerDashboardMessageDeliveryRecordMutation")

/**
 * Delivers one message.
 *
 * Honest delivery only: the shared team delivery resolve is reused, and no
 * mail provider is wired for messages yet, so there is no sender. The claim
 * is recorded as `skipped` with the reason instead of pretending a mail went
 * out. When a provider lands, only the sender construction changes.
 */
export const organizerDashboardMessageDeliverAction = internalAction({
  args: { messageId: convexV.id("organizerDashboardMessages") },
  handler: async (ctx, args): PromiseResult<null> => {
    const claim = await ctx.runMutation(organizerDashboardMessageDeliveryClaimReference, {
      messageId: args.messageId,
    })
    if (!claim.success) return claim
    if (claim.data.status === "skipped") return createResult(null)
    const outcome = await organizerDashboardTeamDeliveryResolve({
      sender: null,
      skippedReason: "Message mail provider is not configured",
    })
    const recorded = await ctx.runMutation(organizerDashboardMessageDeliveryRecordReference, {
      messageId: args.messageId,
      attempt: claim.data.attempt,
      state: outcome.state,
      ...(outcome.state === "sent" ? {} : { reason: outcome.reason }),
    })
    if (!recorded.success) return recorded
    return createResult(null)
  },
})
