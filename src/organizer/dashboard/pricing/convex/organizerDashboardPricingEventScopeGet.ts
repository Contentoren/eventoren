import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export type OrganizerDashboardPricingEventScope = {
  readonly event: Doc<"catalogEvents">
  readonly tier: Doc<"catalogTicketTiers"> | null
}

/**
 * Canonical organization scope for pricing writes and reads. The event must
 * belong to the requested organization; a missing or foreign event is refused
 * instead of guessed. When `tierKey` is given, the tier must exist on that
 * event and must not be archived.
 */
export async function organizerDashboardPricingEventScopeGet(
  ctx: { db: DatabaseReader },
  orgId: Id<"orgs">,
  eventKey: string,
  op: string,
  tierKey?: string,
): PromiseResult<OrganizerDashboardPricingEventScope> {
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
    .unique()
  if (!event || event.orgId !== orgId) return createResultError(op, "Veranstaltung nicht verfügbar")
  if (tierKey === undefined) return createResult({ event, tier: null })
  const tier = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", tierKey))
    .unique()
  if (!tier || tier.archivedAt !== undefined) {
    return createResultError(op, "Ticketart nicht verfügbar")
  }
  return createResult({ event, tier })
}
