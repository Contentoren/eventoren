import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketReservationDeferMutation = internalMutation({
  args: { orderId: v.id("ticketOrders"), reason: v.string() },
  handler: async (ctx, args): PromiseResult<{ deferred: boolean }> => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError("ticketReservationDeferMutation", "The order was not found")
    if (
      order.status === "paid" ||
      order.status === "failed" ||
      order.status === "expired" ||
      order.status === "released"
    )
      return createResult({ deferred: false })
    const now = new Date().toISOString()
    await ctx.db.patch("ticketOrders", order._id, {
      reservationExpiresAt: Date.now() + 15 * 60 * 1000,
      checkoutAttemptLeaseUntil: undefined,
      lastPaymentError: args.reason.slice(0, 500),
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(15 * 60 * 1000, internal.ticketing.ticketReservationExpireAction, {
      orderId: order._id,
    })
    return createResult({ deferred: true })
  },
})
