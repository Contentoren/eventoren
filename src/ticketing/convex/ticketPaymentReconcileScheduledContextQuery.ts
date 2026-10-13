import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { internalQuery } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"

export const ticketPaymentReconcileScheduledContextQuery = internalQuery({
  args: { stripeMode: v.union(v.literal("live"), v.literal("test")), now: v.number() },
  handler: async (
    ctx,
    args,
  ): PromiseResult<
    {
      orderId: Id<"ticketOrders">
      paymentReference: string
      billingOrderReference?: string
      stripeMode: "live" | "test"
    }[]
  > => {
    const reserved = await ctx.db
      .query("ticketOrders")
      .withIndex("statusAndStripeModeAndUpdatedAt", (q) => q.eq("status", "reserved").eq("stripeMode", args.stripeMode))
      .order("asc")
      .take(25)
    const checkoutCreated = await ctx.db
      .query("ticketOrders")
      .withIndex("statusAndStripeModeAndUpdatedAt", (q) =>
        q.eq("status", "checkout_created").eq("stripeMode", args.stripeMode),
      )
      .order("asc")
      .take(25)
    // Issued SEPA orders retain an active status until settlement/cancellation.
    // Do not filter by ticket count, booking details, reservation deadline or
    // event end here: a processing debit has no local settlement timeout.
    // Paid history is deliberately absent; explicit reconciliation and the
    // authenticated cancellation receiver recover post-settlement outcomes.
    // Terminal partitions need a read-budgeted cursor scan, owned by the
    // scheduled action and ticketPaymentReconcileTerminalPageQuery.
    return createResult(
      [...reserved, ...checkoutCreated].map((order) => ({
        orderId: order._id,
        paymentReference: order.paymentReference,
        billingOrderReference: order.billingOrderReference,
        stripeMode: order.stripeMode,
      })),
    )
  },
})
