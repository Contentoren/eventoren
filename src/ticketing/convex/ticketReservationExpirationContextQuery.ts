import { v } from "convex/values"
import { internalQuery } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketReservationExpirationContextQuery = internalQuery({
  args: { orderId: v.id("ticketOrders") },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    paymentReference: string
    billingOrderReference?: string
    stripeMode: "live" | "test"
    status: "reserved" | "checkout_created" | "paid" | "failed" | "expired" | "released" | "paid_inventory_conflict"
    paymentStatus: "pending" | "paid" | "failed" | "expired"
    checkoutAttemptLeaseUntil?: number
  }> => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError("ticketReservationExpirationContextQuery", "The order was not found")
    return createResult({
      paymentReference: order.paymentReference,
      billingOrderReference: order.billingOrderReference,
      stripeMode: order.stripeMode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      checkoutAttemptLeaseUntil: order.checkoutAttemptLeaseUntil,
    })
  },
})
