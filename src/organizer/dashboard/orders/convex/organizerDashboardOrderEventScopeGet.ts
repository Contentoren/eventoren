import type { DatabaseReader } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"

export async function organizerDashboardOrderEventScopeGet(
  ctx: { db: DatabaseReader },
  orgId: Id<"orgs">,
  eventKey: string,
  op: string,
) {
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
    .unique()
  if (!event || event.orgId !== orgId) return createResultError(op, "Veranstaltung nicht verfügbar")
  return createResult(event)
}
