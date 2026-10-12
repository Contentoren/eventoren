import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"

export async function ticketIssuedCountRead(ctx: MutationCtx, orderId: Id<"ticketOrders">): PromiseResult<number> {
  // Per-product order limits replace the former global total cap: read the
  // whole per-order set instead of truncating legitimate orders above ten.
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", orderId))
    .collect()
  return createResult(tickets.length)
}
