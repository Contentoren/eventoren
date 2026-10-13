import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketFulfillmentWorkOnlineUrlEnsureMutation = internalMutation({
  args: {
    workId: v.id("ticketFulfillmentWork"),
    onlineTicketUrl: v.string(),
    deliveryMode: v.union(v.literal("tickets_only"), v.literal("paid")),
    attemptCount: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{ onlineTicketUrl: string; replayed: boolean; stale?: false } | { stale: true }> => {
    const op = "ticketFulfillmentWorkOnlineUrlEnsureMutation"
    const work = await ctx.db.get("ticketFulfillmentWork", args.workId)
    if (!work) return createResultError(op, "The fulfillment work was not found")
    if (work.cancelledAt !== undefined) return createResultError(op, "The fulfillment work was cancelled")
    if ((work.deliveryMode ?? "paid") !== args.deliveryMode || work.attemptCount !== args.attemptCount)
      return createResult({ stale: true })
    const order = await ctx.db.get("ticketOrders", work.orderId)
    if (!order) return createResultError(op, "The fulfillment order was not found")
    if (order.cancellation !== undefined) return createResultError(op, "The fulfillment order was cancelled")
    if (order.emailAccessRevokedAt !== undefined)
      return createResultError(op, "The ticket access capability was revoked")
    let url: URL
    try {
      url = new URL(args.onlineTicketUrl)
    } catch (error) {
      return createResultError(op, "The ticket access URL is invalid", String(error))
    }
    if (url.username || url.password || (url.protocol !== "http:" && url.protocol !== "https:"))
      return createResultError(op, "The ticket access URL is invalid")

    if (work.onlineTicketUrl !== undefined)
      return createResult({ onlineTicketUrl: work.onlineTicketUrl, replayed: true })

    await ctx.db.patch("ticketFulfillmentWork", work._id, {
      onlineTicketUrl: args.onlineTicketUrl,
      updatedAt: new Date().toISOString(),
    })
    return createResult({ onlineTicketUrl: args.onlineTicketUrl, replayed: false })
  },
})
