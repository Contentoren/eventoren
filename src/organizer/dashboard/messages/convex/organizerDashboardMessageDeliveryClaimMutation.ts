import { v as convexV } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { OrganizerDashboardMessageDeliveryClaimResult } from "../organizerDashboardMessageDeliveryClaimResult.ts"

/**
 * Claims one message for exactly one delivery attempt. Same deduplication
 * point as the team invitation claim: a message that is already claimed or
 * already sent is never sent twice, and a sent message is never downgraded.
 */
export const organizerDashboardMessageDeliveryClaimMutation = internalMutation({
  args: { messageId: convexV.id("organizerDashboardMessages") },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardMessageDeliveryClaimResult> => {
    const op = "organizerDashboardMessageDeliveryClaimMutation"
    const message = await ctx.db.get("organizerDashboardMessages", args.messageId)
    if (!message) return createResultError(op, "Message not found")
    if (message.status === "gesendet" || message.deliveryState === "sent") {
      if (message.deliveryState === "queued") {
        await ctx.db.patch("organizerDashboardMessages", message._id, {
          deliveryState: "skipped",
          deliveryReason: "already_sent",
          updatedAt: new Date().toISOString(),
        })
      }
      return createResult({ status: "skipped", reason: "already_sent" })
    }
    if (message.status !== "geplant") {
      if (message.deliveryState === "queued") {
        await ctx.db.patch("organizerDashboardMessages", message._id, {
          deliveryState: "skipped",
          deliveryReason: "not_scheduled",
          updatedAt: new Date().toISOString(),
        })
      }
      return createResult({ status: "skipped", reason: "not_scheduled" })
    }
    if (message.deliveryState === "sending") {
      return createResult({ status: "skipped", reason: "already_claimed" })
    }
    const attempt = message.deliveryAttempts + 1
    await ctx.db.patch("organizerDashboardMessages", message._id, {
      deliveryState: "sending",
      deliveryAttempts: attempt,
      deliveryLastAttemptAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return createResult({
      status: "claimed",
      attempt,
      subject: message.subject,
      recipientCount: message.recipientCount,
      eventKey: message.eventKey,
    })
  },
})
