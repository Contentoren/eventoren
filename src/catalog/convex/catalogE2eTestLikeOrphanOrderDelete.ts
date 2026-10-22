import type { Doc } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

const childTake = 101
const maxLines = 10

/**
 * Delete one test-like orphan order (event row already gone) with its child
 * graph. Line proof is relaxed against the strict marker-tuple check: lines
 * must reference the order event key with a positive quantity, attempts must
 * be test-mode, and issued tickets must belong to the order. Paid orders
 * still require exactly one issued ticket. Used only after the success
 * barrier; routine sweeps stay on exact run proof.
 */
export async function catalogE2eTestLikeOrphanOrderDelete(
  ctx: MutationCtx,
  order: Doc<"ticketOrders">,
): PromiseResult<number> {
  const op = "catalogE2eTestLikeOrphanOrderDelete"
  const lines = await ctx.db
    .query("ticketOrderLines")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (
    lines.length === 0 ||
    lines.length > maxLines ||
    lines.some((line) => line.eventKey !== order.eventKey || line.quantity < 1)
  )
    return createResultError(op, "Orphan order lines do not prove the test-like fixture event")
  const attempts = await ctx.db
    .query("ticketPaymentAttempts")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (attempts.length > 100 || attempts.some((payment) => payment.stripeMode !== "test"))
    return createResultError(op, "Non-test or unbounded payment attempts; no cleanup performed")
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (tickets.length > 100 || tickets.some((ticket) => ticket.eventKey !== order.eventKey))
    return createResultError(op, "Orphan issued tickets do not match the test-like fixture event")
  if (order.status === "paid" && tickets.length !== 1)
    return createResultError(op, "Paid orphan order has no single proven issued ticket")
  const deliveries = await ctx.db
    .query("ticketOrderDeliveries")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  const fulfillment = await ctx.db
    .query("ticketFulfillmentWork")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  const reservations = await ctx.db
    .query("ticketReservations")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (deliveries.length > 100 || fulfillment.length > 100 || reservations.length > 100)
    return createResultError(op, "Fixture exceeds bounded verification limit")
  const history: Doc<"ticketCheckInHistory">[] = []
  for (const ticket of tickets)
    history.push(
      ...(await ctx.db
        .query("ticketCheckInHistory")
        .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
        .take(childTake)),
    )
  if (history.length > 500) return createResultError(op, "Fixture exceeds bounded verification limit")
  for (const row of history) await ctx.db.delete("ticketCheckInHistory", row._id)
  for (const row of tickets) await ctx.db.delete("ticketIssued", row._id)
  for (const row of deliveries) await ctx.db.delete("ticketOrderDeliveries", row._id)
  for (const row of fulfillment) await ctx.db.delete("ticketFulfillmentWork", row._id)
  for (const row of attempts) await ctx.db.delete("ticketPaymentAttempts", row._id)
  for (const row of lines) await ctx.db.delete("ticketOrderLines", row._id)
  for (const row of reservations) await ctx.db.delete("ticketReservations", row._id)
  await ctx.db.delete("ticketOrders", order._id)
  if (await ctx.db.get("ticketOrders", order._id))
    return createResultError(op, "Orphan order cleanup verification failed")
  return createResult(tickets.length)
}
