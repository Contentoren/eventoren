import { internalQuery } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketOrderPaymentContextQuery = internalQuery({
  args: {
    orderId: v.id("ticketOrders"),
    ownerUserId: v.optional(vIdUser),
    guestAccessDigest: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    paymentReference: string
    stripeMode: "live" | "test"
    billingOrderReference?: string
  }> => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError("ticketOrderPaymentContextQuery", "The order was not found")
    const authorized =
      (args.ownerUserId !== undefined && args.ownerUserId === order.ownerUserId) ||
      (args.guestAccessDigest !== undefined && args.guestAccessDigest === order.guestAccessDigest)
    if (!authorized) return createResultError("ticketOrderPaymentContextQuery", "The order was not found")
    return createResult({
      paymentReference: order.paymentReference,
      stripeMode: order.stripeMode,
      billingOrderReference: order.billingOrderReference,
    })
  },
})
