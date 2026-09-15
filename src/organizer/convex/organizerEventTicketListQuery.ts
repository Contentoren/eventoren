import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerAuthorizeFn } from "./organizerAuthorizeFn.js"
import { organizerTicketProjectionCreate } from "./organizerTicketProjectionCreate.js"

type OrganizerTicketItem = ReturnType<typeof organizerTicketProjectionCreate>

export const organizerEventTicketListQuery = query({
  args: {
    eventKey: v.string(),
    search: v.optional(v.string()),
    token: v.string(),
  },
  handler: async (ctx, args): PromiseResult<readonly OrganizerTicketItem[]> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const globalAuthorization = await organizerAuthorizeFn(queryCtx, userId)
      if (!globalAuthorization.success) return globalAuthorization

      const event = await queryCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
        .unique()
      if (!event) return createResultError("organizerEventTicketListQuery", "The event was not found")

      const eventAuthorization = await organizerAuthorizeFn(queryCtx, userId, event.startsAt)
      if (!eventAuthorization.success) return eventAuthorization

      const search = args.search?.trim().toLowerCase() ?? ""
      const tickets = await queryCtx.db
        .query("ticketIssued")
        .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
        .collect()
      const items: OrganizerTicketItem[] = []
      for (const ticket of tickets) {
        const order = await queryCtx.db.get(ticket.orderId)
        if (!order || order.eventKey !== event.eventKey) continue
        const item = organizerTicketProjectionCreate(ticket, order, event)
        if (search.length > 0 && !organizerTicketSearchMatches(item, search)) continue
        items.push(item)
      }

      items.sort((left, right) => left.sequence - right.sequence || left.ticketNumber.localeCompare(right.ticketNumber))
      return createResult(items)
    }),
})

function organizerTicketSearchMatches(item: OrganizerTicketItem, search: string): boolean {
  return [item.participantName, item.buyerName, item.buyerGivenName, item.buyerFamilyName].some((value) =>
    value.toLowerCase().includes(search),
  )
}
