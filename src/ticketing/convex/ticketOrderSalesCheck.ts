import type { Doc } from "#convex/_generated/dataModel.js"
import type { QueryCtx } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import { ticketOrganizerSalesCheck } from "./ticketOrganizerSalesCheck.js"

/**
 * Late checkout gate for an already-reserved order. Resolves the authoritative
 * canonical event from `order.eventKey` and applies the organizer sales check
 * against the CANONICAL event org — never the order's reservation-time
 * snapshot, which is never rebound here.
 *
 * Fail-closed: a missing, deleted, or unpublished canonical event denies an
 * unpaid checkout, as does any order snapshot org that disagrees with the
 * canonical event org (stale or corrupt snapshot, including an unsupported
 * ownership transfer). Unowned legacy contexts (no org on either side) pass
 * unchanged.
 *
 * Read-only: no external calls, no logging (no PII), no writes.
 */
export async function ticketOrderSalesCheck(
  ctx: Pick<QueryCtx, "db">,
  order: Doc<"ticketOrders">,
): PromiseResult<void> {
  const op = "ticketOrderSalesCheck"
  const events = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", order.eventKey))
    .take(2)
  if (events.length > 1) return createResultError(op, "The event identity is ambiguous")
  const event = events[0]
  if (!event || event.deletedAt !== undefined || event.status !== "published")
    return createResultError(op, "The event is not available for checkout")
  if (order.orgId !== undefined && order.orgId !== event.orgId)
    return createResultError(op, "The order ownership snapshot conflicts with the event")
  return ticketOrganizerSalesCheck(ctx, event.orgId)
}
