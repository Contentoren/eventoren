import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { organizerAuthorizeFn } from "./organizerAuthorizeFn.js"
import { organizerTicketCheckInErrorCreate } from "./organizerTicketCheckInErrorCreate.js"
import { organizerTicketCheckInTargetResolve } from "./organizerTicketCheckInTargetResolve.js"

export async function organizerTicketCheckInTicketResolve(
  ctx: { db: DatabaseReader },
  userId: IdUser,
  target: { eventKey: string; ticketCode?: string; ticketId?: Id<"ticketIssued"> },
  op: string,
): PromiseResult<{
  user: Doc<"users">
  event: Doc<"catalogEvents">
  ticket: Doc<"ticketIssued">
  order: Doc<"ticketOrders">
}> {
  const globalAuthorization = await organizerAuthorizeFn(ctx, userId)
  if (!globalAuthorization.success)
    return organizerTicketCheckInErrorCreate(op, "organizer.check-in.unauthorized", globalAuthorization.errorMessage)
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", target.eventKey))
    .unique()
  if (!event)
    return organizerTicketCheckInErrorCreate(op, "organizer.check-in.event-not-found", "The event was not found", {
      eventKey: target.eventKey,
    })
  const eventAuthorization = await organizerAuthorizeFn(ctx, userId, event.startsAt)
  if (!eventAuthorization.success)
    return organizerTicketCheckInErrorCreate(op, "organizer.check-in.unauthorized", eventAuthorization.errorMessage, {
      eventKey: target.eventKey,
    })
  const resolved = await organizerTicketCheckInTargetResolve(ctx, event, target, op)
  if (!resolved.success) return resolved
  return createResult({ ...resolved.data, user: eventAuthorization.data })
}
