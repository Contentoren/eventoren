import { v as convexV } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

/**
 * Records the result of one delivery attempt.
 *
 * The result is only applied when the attempt is still the current one, so a
 * late result of an older attempt can never overwrite a newer state. A
 * delivered mail is never downgraded.
 */
export const organizerDashboardTeamInvitationDeliveryRecordMutation = internalMutation({
  args: {
    invitationId: convexV.id("organizerDashboardTeamInvitations"),
    attempt: convexV.number(),
    state: convexV.union(convexV.literal("sent"), convexV.literal("failed"), convexV.literal("skipped")),
    reason: convexV.optional(convexV.string()),
  },
  handler: async (ctx, args): PromiseResult<{ readonly recorded: boolean }> => {
    const op = "organizerDashboardTeamInvitationDeliveryRecordMutation"
    const invitation = await ctx.db.get("organizerDashboardTeamInvitations", args.invitationId)
    if (!invitation) return createResultError(op, "Einladung nicht gefunden.")
    if (invitation.deliveryState !== "sending" || invitation.deliveryAttempts !== args.attempt) {
      return createResult({ recorded: false })
    }
    await ctx.db.patch("organizerDashboardTeamInvitations", invitation._id, {
      deliveryState: args.state,
      deliveryReason: args.reason,
      updatedAt: new Date().toISOString(),
    })
    return createResult({ recorded: true })
  },
})
