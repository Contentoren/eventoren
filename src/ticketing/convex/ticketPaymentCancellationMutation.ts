import { internalMutation } from "#convex/_generated/server.js"
import { createResultError } from "#result"
import { ticketPaymentCancellationValidator } from "./ticketPaymentCancellationValidator.js"
import { ticketPaymentCancellationApply } from "./ticketPaymentCancellationApply.js"

export const ticketPaymentCancellationMutation = internalMutation({
  args: { cancellation: ticketPaymentCancellationValidator },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("ticketOrders")
      .withIndex("paymentReference", (q) => q.eq("paymentReference", args.cancellation.paymentReference))
      .unique()
    if (!order) return createResultError("ticketPaymentCancellationMutation", "The cancellation order was not found")
    return ticketPaymentCancellationApply(ctx, order, args.cancellation)
  },
})
