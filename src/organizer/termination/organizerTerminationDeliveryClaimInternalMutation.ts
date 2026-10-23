import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
export const organizerTerminationDeliveryClaimInternalMutation = internalMutation({
  args: { requestId: v.id("organizerTerminationRequests") },
  handler: async (ctx, { requestId }) => {
    const request = await ctx.db.get(requestId)
    const delivery = await ctx.db
      .query("organizerTerminationDeliveries")
      .withIndex("requestId", (q) => q.eq("requestId", requestId))
      .unique()
    if (!request || !delivery || delivery.status === "sent" || delivery.attempts >= 8) return null
    if (delivery.status === "pending" && delivery.attempts > 0 && Date.now() - delivery.updatedAt < 300_000) return null
    await ctx.db.patch(delivery._id, { attempts: delivery.attempts + 1, status: "pending", updatedAt: Date.now() })
    // Recover a worker crash after claiming (SMTP itself is at-least-once).
    await ctx.scheduler.runAfter(301_000, internal.organizerTerminationEmail.organizerTerminationEmailInternalAction, {
      requestId,
    })
    return { request, delivery, attempt: delivery.attempts + 1 }
  },
})
