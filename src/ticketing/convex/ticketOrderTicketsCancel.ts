import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"

/**
 * Established cancellation behavior of issued tickets: no admission stays valid
 * and no fulfillment work keeps running for the order. No fallible steps: every
 * decision was validated by the caller before the first write.
 */
export async function ticketOrderTicketsCancel(ctx: MutationCtx, orderId: Id<"ticketOrders">, now: string) {
  // Complete per-order sets, bounded by checkout transaction size; never truncate tickets.
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", orderId))
    .collect()
  const works = await ctx.db
    .query("ticketFulfillmentWork")
    .withIndex("orderId", (q) => q.eq("orderId", orderId))
    .collect()
  for (const ticket of tickets) await ctx.db.patch("ticketIssued", ticket._id, { cancelled: true })
  for (const work of works)
    await ctx.db.patch("ticketFulfillmentWork", work._id, {
      cancelledAt: now,
      leaseUntil: undefined,
      nextAttemptAt: Number.MAX_SAFE_INTEGER,
      status: work.status === "preparing" ? "pending" : work.status,
      updatedAt: now,
    })
}
