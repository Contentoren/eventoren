import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketFulfillmentWorkPreparedMutation = internalMutation({
  args: {
    workId: v.id("ticketFulfillmentWork"),
    fulfillmentReference: v.string(),
    deliveryMode: v.optional(v.union(v.literal("tickets_only"), v.literal("paid"))),
    attemptCount: v.optional(v.number()),
  },
  handler: async (ctx, args): PromiseResult<{ prepared: boolean; replayed: boolean; stale: boolean }> => {
    const work = await ctx.db.get("ticketFulfillmentWork", args.workId)
    if (!work) return createResultError("ticketFulfillmentWorkPreparedMutation", "The fulfillment work was not found")
    if (work.cancelledAt !== undefined)
      return createResultError("ticketFulfillmentWorkPreparedMutation", "The fulfillment work was cancelled")
    if (
      (work.deliveryMode ?? "paid") !== (args.deliveryMode ?? "paid") ||
      (args.attemptCount !== undefined && args.attemptCount !== work.attemptCount)
    )
      return createResult({ prepared: false, replayed: false, stale: true })
    if (work.fulfillmentReference !== undefined && work.fulfillmentReference !== args.fulfillmentReference)
      return createResultError("ticketFulfillmentWorkPreparedMutation", "The fulfillment reference changed")
    if (work.status === "prepared") return createResult({ prepared: true, replayed: true, stale: false })
    const now = new Date().toISOString()
    await ctx.db.patch("ticketFulfillmentWork", work._id, {
      status: "prepared",
      fulfillmentReference: args.fulfillmentReference,
      preparedAt: now,
      leaseUntil: undefined,
      lastError: undefined,
      updatedAt: now,
    })
    return createResult({ prepared: true, replayed: false, stale: false })
  },
})
