import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketPaymentReconcileFailureMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    errorMessage: v.string(),
  },
  handler: async (ctx, args): PromiseResult<{ recorded: boolean }> => {
    const op = "ticketPaymentReconcileFailureMutation"
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError(op, "The order was not found")
    if (order.paymentReference !== args.paymentReference || order.stripeMode !== args.stripeMode)
      return createResultError(op, "The payment correlation does not match the order")
    if (!["reserved", "checkout_created", "expired", "released"].includes(order.status))
      return createResult({ recorded: false })
    const now = new Date().toISOString()
    await ctx.db.patch("ticketOrders", order._id, {
      lastPaymentCheckAt: now,
      lastPaymentError: args.errorMessage.slice(0, 500),
      updatedAt: now,
    })
    return createResult({ recorded: true })
  },
})
