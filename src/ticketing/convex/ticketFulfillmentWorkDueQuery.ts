import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { internalQuery } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"

export const ticketFulfillmentWorkDueQuery = internalQuery({
  args: { stripeMode: v.union(v.literal("live"), v.literal("test")) },
  handler: async (ctx, args): PromiseResult<{ workId: Id<"ticketFulfillmentWork"> }[]> => {
    const pending = await ctx.db
      .query("ticketFulfillmentWork")
      .withIndex("stripeModeAndStatusAndNextAttemptAt", (q) =>
        q.eq("stripeMode", args.stripeMode).eq("status", "pending").lte("nextAttemptAt", Date.now()),
      )
      .take(10)
    const preparing = await ctx.db
      .query("ticketFulfillmentWork")
      .withIndex("stripeModeAndStatusAndNextAttemptAt", (q) =>
        q.eq("stripeMode", args.stripeMode).eq("status", "preparing"),
      )
      .take(10)
    return createResult([...pending, ...preparing].map((work) => ({ workId: work._id })))
  },
})
