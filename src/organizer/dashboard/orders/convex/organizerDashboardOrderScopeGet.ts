import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"

type OrganizerDashboardOrderScope = {
  event: Doc<"catalogEvents">
  order: Doc<"ticketOrders">
}

/**
 * Canonical organization scope for one order. The event organization, the
 * order organization snapshot and the requested organization must all agree;
 * a missing snapshot or any conflict is refused instead of guessed.
 */
export async function organizerDashboardOrderScopeGet(
  ctx: { db: DatabaseReader },
  orgId: Id<"orgs">,
  orderId: Id<"ticketOrders">,
  op: string,
): PromiseResult<OrganizerDashboardOrderScope> {
  const order = await ctx.db.get("ticketOrders", orderId)
  if (!order || order.orgId !== orgId) return createResultError(op, "Bestellung nicht verfügbar")

  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", order.eventKey))
    .unique()
  if (!event || event.orgId !== orgId) return createResultError(op, "Bestellung nicht verfügbar")

  return createResult({ event, order })
}
