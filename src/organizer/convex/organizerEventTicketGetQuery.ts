import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerAuthorizeFn } from "./organizerAuthorizeFn.js"
import { organizerTicketProjectionCreate } from "./organizerTicketProjectionCreate.js"

type OrganizerTicketItem = ReturnType<typeof organizerTicketProjectionCreate>

export const organizerEventTicketGetQuery = query({
  args: {
    eventKey: v.string(),
    ticketId: v.id("ticketIssued"),
    token: v.string(),
  },
  handler: async (ctx, args): PromiseResult<OrganizerTicketItem> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const globalAuthorization = await organizerAuthorizeFn(queryCtx, userId)
      if (!globalAuthorization.success) return globalAuthorization

      const event = await queryCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
        .unique()
      if (!event) return createResultError("organizerEventTicketGetQuery", "The event was not found")

      const eventAuthorization = await organizerAuthorizeFn(queryCtx, userId, event.startsAt)
      if (!eventAuthorization.success) return eventAuthorization

      const ticket = await queryCtx.db.get(args.ticketId)
      if (!ticket || ticket.eventKey !== event.eventKey)
        return createResultError("organizerEventTicketGetQuery", "The ticket was not found")
      const order = await queryCtx.db.get(ticket.orderId)
      if (!order || order.eventKey !== event.eventKey)
        return createResultError("organizerEventTicketGetQuery", "The ticket was not found")

      return createResult(organizerTicketProjectionCreate(ticket, order, event))
    }),
})
