import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createResultError } from "#result"
import { scannerLinkAuthorizeFn } from "./scannerLinkAuthorizeFn.js"

/** Ticket endpoints must use this with their ticket's event key on every request. */
export async function scannerLinkEventAuthorizeFn(ctx: MutationCtx | QueryCtx, code: string, eventKey: string) {
  const authorization = await scannerLinkAuthorizeFn(ctx, code)
  if (!authorization.success) return authorization
  if (!authorization.data.eventKeys.includes(eventKey)) {
    return createResultError("scannerLinkEventAuthorizeFn", "Event not allowed")
  }
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
    .unique()
  if (!event || event.deletedAt || event.status !== "published") {
    return createResultError("scannerLinkEventAuthorizeFn", "Event unavailable")
  }
  return authorization
}
