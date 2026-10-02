import { v } from "convex/values"
import { internalQuery } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { TicketPaymentReconcileScan } from "./ticketPaymentReconcileScanValidator.js"

export const ticketPaymentReconcileTerminalPageQuery = internalQuery({
  args: {
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    now: v.number(),
    status: v.union(v.literal("expired"), v.literal("released")),
    cursor: v.union(v.string(), v.null()),
    numItems: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    contexts: TicketPaymentReconcileScan["selected"]
    isDone: boolean
    continueCursor: string
  }> => {
    const op = "ticketPaymentReconcileTerminalPageQuery"
    if (!Number.isInteger(args.numItems) || args.numItems < 1 || args.numItems > 25)
      return createResultError(op, "numItems must be between 1 and 25")
    if (!Number.isFinite(args.now) || !Number.isFinite(new Date(args.now).getTime()))
      return createResultError(op, "The reconciliation cutoff must be a valid timestamp")
    const futureEventCutoff = new Date(args.now).toISOString()
    const page = await ctx.db
      .query("ticketOrders")
      .withIndex("statusAndStripeModeAndUpdatedAt", (q) =>
        q.eq("status", args.status).eq("stripeMode", args.stripeMode),
      )
      // Eligibility must precede the oldest-updated cap. This filter is bounded
      // by maximumRowsRead (100, including rejected rows), not just numItems.
      // Exactly one paginate per query execution; the scheduled action persists
      // the cursor AND fixed cutoff, including for empty non-final pages.
      // eslint-disable-next-line @convex-dev/no-filter-in-query
      .filter((q) => q.gt(q.field("eventEndsAt"), futureEventCutoff))
      .order("asc")
      .paginate({
        cursor: args.cursor,
        numItems: args.numItems,
        maximumRowsRead: 100,
        maximumBytesRead: 256 * 1024,
      })
    return createResult({
      contexts: page.page
        .filter((order) => {
          const eventEndsAt = Date.parse(order.eventEndsAt)
          return Number.isFinite(eventEndsAt) && eventEndsAt > args.now
        })
        .map((order) => ({
          orderId: order._id,
          paymentReference: order.paymentReference,
          billingOrderReference: order.billingOrderReference,
          stripeMode: order.stripeMode,
        })),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    })
  },
})
