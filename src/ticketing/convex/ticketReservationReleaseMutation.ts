import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketIssuedCountRead } from "./ticketIssuedCountRead.js"
import { ticketOrderTicketsCancel } from "./ticketOrderTicketsCancel.js"
import { ticketReservationsRelease } from "./ticketReservationsRelease.js"

export const ticketReservationReleaseMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    reason: v.string(),
  },
  handler: async (ctx, args): PromiseResult<{ orderId: string; released: boolean }> => {
    const order = await ctx.db.get("ticketOrders", args.orderId)
    if (!order) return createResultError("ticketReservationReleaseMutation", "The order was not found")
    if (order.status === "paid" || order.paymentStatus === "paid")
      return createResultError("ticketReservationReleaseMutation", "Paid inventory cannot be released")
    if (order.status === "expired") return createResult({ orderId: order._id, released: false })
    if (order.status === "released") return createResult({ orderId: order._id, released: false })
    const ticketCount = await ticketIssuedCountRead(ctx, order._id)
    if (!ticketCount.success) return ticketCount
    // Tickets without an issuance timestamp are corrupt and never silently cancelled.
    if (ticketCount.data !== 0 && order.ticketsIssuedAt === undefined)
      return createResultError("ticketReservationReleaseMutation", "An unpaid order already has issued tickets")
    const now = new Date().toISOString()
    const attempt = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("paymentReference", (q) => q.eq("paymentReference", order.paymentReference))
      .unique()
    if (attempt && attempt.orderId !== order._id)
      return createResultError("ticketReservationReleaseMutation", "The payment attempt does not belong to the order")
    const releaseResult = await ticketReservationsRelease(ctx, order._id, now)
    if (!releaseResult.success) return releaseResult
    // A definitively unpaid end state keeps no valid admission alive.
    if (ticketCount.data !== 0) await ticketOrderTicketsCancel(ctx, order._id, now)
    await ctx.db.patch("ticketOrders", order._id, {
      status: "released",
      paymentStatus: "failed",
      releasedAt: now,
      checkoutAttemptLeaseUntil: undefined,
      lastPaymentError: args.reason.slice(0, 500),
      updatedAt: now,
    })
    if (attempt)
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        status: "failed",
        lastCheckedAt: now,
        updatedAt: now,
      })
    return createResult({ orderId: order._id, released: true })
  },
})
