import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketReservationsRelease } from "./ticketReservationsRelease.js"

export const ticketReservationReleaseMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    reason: v.string(),
  },
  handler: async (ctx, args): PromiseResult<{ orderId: string; released: boolean }> => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError("ticketReservationReleaseMutation", "The order was not found")
    if (order.status === "paid" || order.paymentStatus === "paid")
      return createResultError("ticketReservationReleaseMutation", "Paid inventory cannot be released")
    if (order.status === "expired") return createResult({ orderId: order._id, released: false })
    if (order.status === "released") return createResult({ orderId: order._id, released: false })
    const now = new Date().toISOString()
    const releaseResult = await ticketReservationsRelease(ctx, order._id, now)
    if (!releaseResult.success) return releaseResult
    await ctx.db.patch("ticketOrders", order._id, {
      status: "released",
      paymentStatus: "failed",
      releasedAt: now,
      checkoutAttemptLeaseUntil: undefined,
      lastPaymentError: args.reason.slice(0, 500),
      updatedAt: now,
    })
    const attempt = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("paymentReference", (q) => q.eq("paymentReference", order.paymentReference))
      .unique()
    if (attempt)
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        status: "failed",
        lastCheckedAt: now,
        updatedAt: now,
      })
    return createResult({ orderId: order._id, released: true })
  },
})
