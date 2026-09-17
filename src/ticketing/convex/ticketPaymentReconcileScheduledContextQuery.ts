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
    const futureEventCutoff = new Date(args.now).toISOString()
    const reserved = await ctx.db
      .query("ticketOrders")
      .withIndex("statusAndUpdatedAt", (q) => q.eq("status", "reserved"))
      .filter((q) => q.eq(q.field("stripeMode"), args.stripeMode))
      .order("asc")
      .take(25)
    const checkoutCreated = await ctx.db
      .query("ticketOrders")
      .withIndex("statusAndUpdatedAt", (q) => q.eq("status", "checkout_created"))
      .filter((q) => q.eq(q.field("stripeMode"), args.stripeMode))
      .order("asc")
      .take(25)
    const terminal = []
    for (const status of ["expired", "released"] as const) {
      const orders = await ctx.db
        .query("ticketOrders")
        .withIndex("statusAndUpdatedAt", (q) => q.eq("status", status))
        .filter((q) =>
          q.and(q.eq(q.field("stripeMode"), args.stripeMode), q.gt(q.field("eventEndsAt"), futureEventCutoff)),
        )
        .order("asc")
        .take(25)
      terminal.push(
        ...orders.filter((order) => {
          const eventEndsAt = Date.parse(order.eventEndsAt)
          return Number.isFinite(eventEndsAt) && eventEndsAt > args.now
        }),
      )
    }
    return createResult(
      [...reserved, ...checkoutCreated, ...terminal].map((order) => ({
        orderId: order._id,
        paymentReference: order.paymentReference,
        billingOrderReference: order.billingOrderReference,
        stripeMode: order.stripeMode,
      })),
    )
  },
})
