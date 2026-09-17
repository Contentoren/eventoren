import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketFulfillmentWorkRetryMutation = internalMutation({
  args: { workId: v.id("ticketFulfillmentWork"), errorMessage: v.string() },
  handler: async (ctx, args): PromiseResult<{ retryAt: number }> => {
    const work = await ctx.db.get(args.workId)
    if (!work) return createResultError("ticketFulfillmentWorkRetryMutation", "The fulfillment work was not found")
    if (work.status === "prepared") return createResult({ retryAt: work.nextAttemptAt })
    const delay = Math.min(60 * 60 * 1000, 5 * 60 * 1000 * 2 ** Math.min(work.attemptCount, 6))
    const retryAt = Date.now() + delay
    await ctx.db.patch("ticketFulfillmentWork", work._id, {
      status: "pending",
      nextAttemptAt: retryAt,
      leaseUntil: undefined,
      lastError: args.errorMessage.slice(0, 2_000),
      updatedAt: new Date().toISOString(),
    })
    await ctx.scheduler.runAfter(delay, internal.ticketing.ticketFulfillmentPrepareAction, { workId: work._id })
    return createResult({ retryAt })
  },
})
