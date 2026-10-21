import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export type OrganizerDashboardGuestScope = {
  event: Doc<"catalogEvents">
  quota: Doc<"organizerDashboardGuestQuotas"> | null
}

/**
 * Canonical organization scope for guest-list writes. The event organization
 * and the requested organization must agree; a quota must belong to the same
 * event, otherwise it is refused instead of guessed.
 */
export async function organizerDashboardGuestScopeGet(
  ctx: { db: DatabaseReader },
  orgId: Id<"orgs">,
  eventKey: string,
  quotaId: Id<"organizerDashboardGuestQuotas"> | null,
  op: string,
): PromiseResult<OrganizerDashboardGuestScope> {
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
    .unique()
  if (!event || event.orgId !== orgId) return createResultError(op, "Veranstaltung nicht verfügbar")
  if (quotaId === null) return createResult({ event, quota: null })
  const quota = await ctx.db.get("organizerDashboardGuestQuotas", quotaId)
  if (!quota || quota.orgId !== orgId || quota.eventKey !== eventKey)
    return createResultError(op, "Kontingent nicht verfügbar")
  return createResult({ event, quota })
}
