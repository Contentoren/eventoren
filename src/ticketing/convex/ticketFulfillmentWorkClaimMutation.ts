import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketFulfillmentWorkClaimMutation = internalMutation({
  args: { workId: v.id("ticketFulfillmentWork") },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    claimed: boolean
    status: "pending" | "preparing" | "prepared"
    deliveryMode: "tickets_only" | "paid"
    attemptCount: number
  }> => {
    const op = "ticketFulfillmentWorkClaimMutation"
    const work = await ctx.db.get("ticketFulfillmentWork", args.workId)
    if (!work) return createResultError(op, "The fulfillment work was not found")
    const claim = { deliveryMode: work.deliveryMode ?? "paid", attemptCount: work.attemptCount } as const
    if (work.status === "prepared" || work.cancelledAt !== undefined)
      return createResult({ claimed: false, status: work.status, ...claim })
    if (work.nextAttemptAt > Date.now()) return createResult({ claimed: false, status: work.status, ...claim })
    if (work.status === "preparing" && work.leaseUntil !== undefined && work.leaseUntil > Date.now())
      return createResult({ claimed: false, status: work.status, ...claim })
    await ctx.db.patch("ticketFulfillmentWork", work._id, {
      status: "preparing",
      attemptCount: work.attemptCount + 1,
      leaseUntil: Date.now() + 2 * 60 * 1000,
      updatedAt: new Date().toISOString(),
    })
    return createResult({ claimed: true, status: "preparing", ...claim, attemptCount: work.attemptCount + 1 })
  },
})
