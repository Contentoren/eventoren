import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"

/** Lease + watchdog recover even when the action crashes before reporting SMTP's result.
 * SMTP is at-least-once: a crash after delivery can cause a duplicate, never lost evidence. */
export const organizerContractDeliveryClaimInternalMutation = internalMutation({
  args: { deliveryId: v.id("organizerDashboardContractDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.db.get("organizerDashboardContractDeliveries", deliveryId)
    const now = Date.now()
    if (!delivery || delivery.status === "sent" || delivery.status === "failed" || delivery.nextAttemptAt > now)
      return null
    const evidence = await ctx.db.get("organizerDashboardContractConsents", delivery.evidenceId)
    if (delivery.attempts >= 5 || !evidence?.party || !evidence.acceptedFee) {
      await ctx.db.patch("organizerDashboardContractDeliveries", deliveryId, {
        status: "failed",
        updatedAt: now,
        lastError: "Confirmation delivery exhausted or evidence incomplete",
      })
      return null
    }
    const attempts = delivery.attempts + 1
    await ctx.db.patch("organizerDashboardContractDeliveries", deliveryId, {
      status: "sending",
      attempts,
      nextAttemptAt: now + 300_000,
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(
      300_000,
      internal.organizerContractEmail.organizerContractConfirmationSendInternalAction,
      { deliveryId },
    )
    return { evidence, attempts }
  },
})
