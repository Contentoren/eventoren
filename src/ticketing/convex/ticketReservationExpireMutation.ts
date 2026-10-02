import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketReservationsRelease } from "./ticketReservationsRelease.js"
import { ticketIssuedCountRead } from "./ticketIssuedCountRead.js"

export const ticketReservationExpireMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
    billingOrderReference: v.string(),
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    reason: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    orderId: string
    status: "reserved" | "checkout_created" | "paid" | "failed" | "expired" | "released" | "paid_inventory_conflict"
    paymentStatus: "pending" | "paid" | "failed" | "expired"
    ticketCount: number
    expired: boolean
    released: boolean
    paid: boolean
  }> => {
    const op = "ticketReservationExpireMutation"
    const order = await ctx.db.get("ticketOrders", args.orderId)
    if (!order) return createResultError(op, "The order was not found")
    if (
      order.paymentReference !== args.paymentReference ||
      order.stripeMode !== args.stripeMode ||
      (order.billingOrderReference !== undefined && order.billingOrderReference !== args.billingOrderReference)
    )
      return createResultError(op, "The payment correlation does not match the order")

    const ticketCount = await ticketIssuedCountRead(ctx, order._id)
    if (!ticketCount.success) return ticketCount

    if (order.status === "paid" || order.paymentStatus === "paid")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
        expired: false,
        released: false,
        paid: true,
      })
    if (order.status === "expired")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
        expired: true,
        released: false,
        paid: false,
      })
    if (order.status === "failed" || order.status === "released" || order.status === "paid_inventory_conflict")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
        expired: false,
        released: false,
        paid: false,
      })
    if (order.paymentStatus !== "pending")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
        expired: false,
        released: false,
        paid: false,
      })

    if (ticketCount.data !== 0) return createResultError(op, "An unpaid order already has issued tickets")
    const now = new Date().toISOString()
    const attempt = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("paymentReference", (q) => q.eq("paymentReference", order.paymentReference))
      .unique()
    if (attempt && attempt.orderId !== order._id)
      return createResultError(op, "The payment attempt does not belong to the order")
    const releaseResult = await ticketReservationsRelease(ctx, order._id, now)
    if (!releaseResult.success) return releaseResult
    await ctx.db.patch("ticketOrders", order._id, {
      status: "expired",
      paymentStatus: "expired",
      billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
      releasedAt: now,
      lastPaymentCheckAt: now,
      checkoutAttemptLeaseUntil: undefined,
      lastPaymentError: args.reason.slice(0, 500),
      updatedAt: now,
    })
    if (attempt)
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        billingOrderReference: args.billingOrderReference,
        status: "expired",
        lastCheckedAt: now,
        updatedAt: now,
      })
    return createResult({
      orderId: order._id,
      status: "expired",
      paymentStatus: "expired",
      ticketCount: 0,
      expired: true,
      released: true,
      paid: false,
    })
  },
})
