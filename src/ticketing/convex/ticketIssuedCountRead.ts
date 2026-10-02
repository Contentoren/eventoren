import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketMaxPerOrder } from "../ticketMaxPerOrder.js"

export async function ticketIssuedCountRead(ctx: MutationCtx, orderId: Id<"ticketOrders">): PromiseResult<number> {
  // Checkout enforces this total quantity; the extra row detects corruption, never truncates a count.
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", orderId))
    .take(ticketMaxPerOrder + 1)
  if (tickets.length > ticketMaxPerOrder)
    return createResultError("ticketIssuedCountRead", "Issued tickets exceed the order maximum")
  return createResult(tickets.length)
}
