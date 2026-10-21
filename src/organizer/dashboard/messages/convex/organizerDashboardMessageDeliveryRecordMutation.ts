import { v as convexV } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

/**
 * Records the result of one delivery attempt. The result only applies while
 * the attempt is still current, so a late result of an older attempt can
 * never overwrite a newer state. A sent message is never downgraded.
 */
export const organizerDashboardMessageDeliveryRecordMutation = internalMutation({
  args: {
    messageId: convexV.id("organizerDashboardMessages"),
    attempt: convexV.number(),
    state: convexV.union(convexV.literal("sent"), convexV.literal("failed"), convexV.literal("skipped")),
    reason: convexV.optional(convexV.string()),
  },
  handler: async (ctx, args): PromiseResult<{ recorded: boolean }> => {
    const op = "organizerDashboardMessageDeliveryRecordMutation"
    const message = await ctx.db.get("organizerDashboardMessages", args.messageId)
    if (!message) return createResultError(op, "Message not found")
    if (message.deliveryState !== "sending" || message.deliveryAttempts !== args.attempt) {
      return createResult({ recorded: false })
    }
    const now = new Date().toISOString()
    await ctx.db.patch("organizerDashboardMessages", message._id, {
      deliveryState: args.state,
      deliveryReason: args.reason,
      ...(args.state === "sent" ? { status: "gesendet", sentAt: now } : {}),
      updatedAt: now,
    })
    return createResult({ recorded: true })
  },
})
