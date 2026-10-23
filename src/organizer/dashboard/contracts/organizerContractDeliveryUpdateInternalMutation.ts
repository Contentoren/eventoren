import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"

export const organizerContractDeliveryUpdateInternalMutation = internalMutation({
  args: { deliveryId: v.id("organizerDashboardContractDeliveries"), attempts: v.number(), sent: v.boolean() },
  handler: async (ctx, { deliveryId, attempts, sent }) => {
    const delivery = await ctx.db.get("organizerDashboardContractDeliveries", deliveryId)
    if (!delivery || delivery.status !== "sending" || delivery.attempts !== attempts) return
    const now = Date.now()
    const exhausted = attempts >= 5
    const delay = 60_000 * 2 ** (attempts - 1)
    await ctx.db.patch("organizerDashboardContractDeliveries", deliveryId, {
      status: sent ? "sent" : exhausted ? "failed" : "pending",
      updatedAt: now,
      nextAttemptAt: now + delay,
      ...(sent ? { sentAt: now, lastError: undefined } : { lastError: "SMTP delivery failed" }),
    })
    if (!sent && !exhausted)
      await ctx.scheduler.runAfter(
        delay,
        internal.organizerContractEmail.organizerContractConfirmationSendInternalAction,
        { deliveryId },
      )
  },
})
