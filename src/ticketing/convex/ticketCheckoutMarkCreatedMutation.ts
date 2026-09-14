import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketCheckoutMarkCreatedMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
    billingOrderReference: v.string(),
    checkoutUrl: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    orderId: string
    paymentReference: string
    billingOrderReference: string
    checkoutUrl: string
    replayed: boolean
  }> => {
    const op = "ticketCheckoutMarkCreatedMutation"
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError(op, "The order was not found")
    if (order.paymentReference !== args.paymentReference) return createResultError(op, "Payment reference mismatch")
    if (order.status === "paid") return createResultError(op, "The order is already paid")
    if (
      order.status === "failed" ||
      order.status === "expired" ||
      order.status === "released" ||
      order.status === "paid_inventory_conflict"
    )
      return createResultError(op, "The order is no longer retryable")
    if (order.status === "checkout_created" && order.checkoutUrl && order.billingOrderReference) {
      if (order.billingOrderReference !== args.billingOrderReference || order.checkoutUrl !== args.checkoutUrl)
        return createResultError(op, "The checkout session evidence conflicts")
      return createResult({
        orderId: order._id,
        paymentReference: order.paymentReference,
        billingOrderReference: order.billingOrderReference,
        checkoutUrl: order.checkoutUrl,
        replayed: true,
      })
    }

    const now = new Date().toISOString()
    await ctx.db.patch("ticketOrders", order._id, {
      status: "checkout_created",
      billingOrderReference: args.billingOrderReference,
      checkoutUrl: args.checkoutUrl,
      checkoutCreatedAt: now,
      checkoutAttemptLeaseUntil: undefined,
      updatedAt: now,
      lastPaymentError: undefined,
    })
    const attempt = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("paymentReference", (q) => q.eq("paymentReference", args.paymentReference))
      .unique()
    if (!attempt) return createResultError(op, "The payment attempt was not found")
    await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
      billingOrderReference: args.billingOrderReference,
      checkoutUrl: args.checkoutUrl,
      status: "checkout_created",
      updatedAt: now,
    })
    return createResult({
      orderId: order._id,
      paymentReference: order.paymentReference,
      billingOrderReference: args.billingOrderReference,
      checkoutUrl: args.checkoutUrl,
      replayed: false,
    })
  },
})
