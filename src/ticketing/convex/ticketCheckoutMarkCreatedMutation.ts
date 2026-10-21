import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketOrderSalesCheck } from "./ticketOrderSalesCheck.js"

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
    checkoutUrl?: string
    replayed: boolean
    // False when the organizer sales gate blocked AFTER the Billing session
    // was created remotely. The remote identifiers are still persisted
    // durably (reconciliation and a later paid settlement keep working) but
    // no pay URL is returned; the caller must suppress it and best-effort
    // expire the unpaid remote session. Never faked true.
    salesAllowed: boolean
  }> => {
    const op = "ticketCheckoutMarkCreatedMutation"
    const order = await ctx.db.get("ticketOrders", args.orderId)
    if (!order) return createResultError(op, "The order was not found")
    if (order.cancellation !== undefined) return createResultError(op, "The order was cancelled")
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
      // Late ownership gate before re-exposing an existing pay URL. The
      // identifiers below are already durable; a block only suppresses the
      // URL in the response, it never discards the bookkeeping.
      const replaySalesCheck = await ticketOrderSalesCheck(ctx, order)
      if (!replaySalesCheck.success)
        return createResult({
          orderId: order._id,
          paymentReference: order.paymentReference,
          billingOrderReference: order.billingOrderReference,
          replayed: true,
          salesAllowed: false,
        })
      return createResult({
        orderId: order._id,
        paymentReference: order.paymentReference,
        billingOrderReference: order.billingOrderReference,
        checkoutUrl: order.checkoutUrl,
        replayed: true,
        salesAllowed: true,
      })
    }

    // The Billing session may already exist remotely at this point (the
    // caller created it before invoking this mutation), so the gate below
    // must never discard the remote outcome: on block the identifiers are
    // still recorded durably and only the pay URL is withheld.
    const salesCheck = await ticketOrderSalesCheck(ctx, order)
    const now = new Date().toISOString()
    await ctx.db.patch("ticketOrders", order._id, {
      status: "checkout_created",
      billingOrderReference: args.billingOrderReference,
      checkoutUrl: salesCheck.success ? args.checkoutUrl : undefined,
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
      checkoutUrl: salesCheck.success ? args.checkoutUrl : undefined,
      status: "checkout_created",
      updatedAt: now,
    })
    if (!salesCheck.success)
      return createResult({
        orderId: order._id,
        paymentReference: order.paymentReference,
        billingOrderReference: args.billingOrderReference,
        replayed: false,
        salesAllowed: false,
      })
    return createResult({
      orderId: order._id,
      paymentReference: order.paymentReference,
      billingOrderReference: args.billingOrderReference,
      checkoutUrl: args.checkoutUrl,
      replayed: false,
      salesAllowed: true,
    })
  },
})
