import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketFulfillmentWorkPreparedMutation = internalMutation({
  args: { workId: v.id("ticketFulfillmentWork"), fulfillmentReference: v.string() },
  handler: async (ctx, args): PromiseResult<{ prepared: true; replayed: boolean }> => {
    const work = await ctx.db.get(args.workId)
    if (!work) return createResultError("ticketFulfillmentWorkPreparedMutation", "The fulfillment work was not found")
    if (work.status === "prepared") return createResult({ prepared: true, replayed: true })
    const now = new Date().toISOString()
    await ctx.db.patch("ticketFulfillmentWork", work._id, {
      status: "prepared",
      fulfillmentReference: args.fulfillmentReference,
      preparedAt: now,
      leaseUntil: undefined,
      lastError: undefined,
      updatedAt: now,
    })
    return createResult({ prepared: true, replayed: false })
  },
})
