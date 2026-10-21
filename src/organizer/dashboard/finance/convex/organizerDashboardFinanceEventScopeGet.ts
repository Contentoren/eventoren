import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export type OrganizerDashboardFinanceEventScope = {
  event: Doc<"catalogEvents">
}

/**
 * Canonical organization scope for one event. The event organization must
 * match the requested organization; a missing or foreign event is refused
 * instead of guessed.
 */
export async function organizerDashboardFinanceEventScopeGet(
  ctx: { db: DatabaseReader },
  orgId: Id<"orgs">,
  eventKey: string,
  op: string,
): PromiseResult<OrganizerDashboardFinanceEventScope> {
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
    .unique()
  if (!event || event.orgId !== orgId) return createResultError(op, "Veranstaltung nicht verfügbar")
  return createResult({ event })
}
