import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

const op = "organizerDashboardEventLoad"

export async function organizerDashboardEventLoad(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"orgs">,
  eventKey: string,
  includeArchived = false,
): PromiseResult<Doc<"catalogEvents">> {
  if (eventKey.trim().length === 0) return createResultError(op, "Event key is required")
  const events = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
    .take(2)
  if (events.length > 1) return createResultError(op, "Event key is ambiguous")
  const event = events[0]
  if (!event || (event.deletedAt !== undefined && !includeArchived)) return createResultError(op, "Event not found")
  if (event.orgId === undefined || event.orgId !== orgId) {
    return createResultError(op, "Event not found")
  }
  return createResult(event)
}
