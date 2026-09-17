import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { internalQuery } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketFulfillmentWorkOrderIdQuery = internalQuery({
  args: { workId: v.id("ticketFulfillmentWork") },
  handler: async (ctx, args): PromiseResult<{ orderId: Id<"ticketOrders"> }> => {
    const work = await ctx.db.get(args.workId)
    if (!work) return createResultError("ticketFulfillmentWorkOrderIdQuery", "The fulfillment work was not found")
    return createResult({ orderId: work.orderId })
  },
})
