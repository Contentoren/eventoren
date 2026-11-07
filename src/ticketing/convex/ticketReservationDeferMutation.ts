import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketReservationDeferMutation = internalMutation({
  args: { orderId: v.id("ticketOrders"), reason: v.string(), isError: v.boolean() },
  handler: async (ctx, args): PromiseResult<{ deferred: boolean }> => {
    const order = await ctx.db.get("ticketOrders", args.orderId)
    if (!order) return createResultError("ticketReservationDeferMutation", "The order was not found")
    if (
      order.status === "paid" ||
      order.status === "failed" ||
      order.status === "expired" ||
      order.status === "released"
    )
      return createResult({ deferred: false })
    const time = Date.now()
    const now = new Date(time).toISOString()
    const count = args.isError ? (order.expireErrorDeferralCount ?? 0) + 1 : 0
    // The 15th consecutive failure occurs about 27 hours after the first with
    // this schedule (assuming requests themselves are quick).
    const attention = args.isError && count >= 15 ? (order.expireAttentionSince ?? now) : undefined
    const delay = 15 * 60 * 1000 * (count < 8 ? 1 : Math.min(24, 2 ** Math.min(count - 7, 5)))
    await ctx.db.patch("ticketOrders", order._id, {
      reservationExpiresAt: time + delay,
      checkoutAttemptLeaseUntil: undefined,
      lastPaymentError: args.reason.slice(0, 500),
      expireErrorDeferralCount: count || undefined,
      expireAttentionSince: attention,
      updatedAt: now,
    })
    if (attention && !order.expireAttentionSince)
      console.error("ticket_reservation_expiry_attention", {
        orderId: order._id,
        paymentReference: order.paymentReference,
        reason: args.reason.slice(0, 500),
        count,
      })
    await ctx.scheduler.runAfter(delay, internal.ticketing.ticketReservationExpireAction, {
      orderId: order._id,
    })
    return createResult({ deferred: true })
  },
})
