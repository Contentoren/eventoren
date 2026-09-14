import { internalMutation } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketCheckoutClaimBillingMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
  },
  handler: async (ctx, args): PromiseResult<{ claimed: boolean }> => {
    const op = "ticketCheckoutClaimBillingMutation"
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError(op, "The order was not found")
    if (order.paymentReference !== args.paymentReference) return createResultError(op, "Payment reference mismatch")
    if (order.status !== "reserved") return createResultError(op, "The order is no longer awaiting Billing")
    await ctx.db.patch("ticketOrders", order._id, {
      checkoutAttemptLeaseUntil: Date.now() + 2 * 60 * 1000,
      updatedAt: new Date().toISOString(),
    })
    return createResult({ claimed: true })
  },
})
