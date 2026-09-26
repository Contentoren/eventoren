import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { organizerTicketProjectionCreate } from "./organizerTicketProjectionCreate.js"
import { scannerLinkEventAuthorizeFn } from "./scannerLinkEventAuthorizeFn.js"

export const scannerLinkEventTicketGetQuery = query({
  args: { code: v.string(), eventKey: v.string(), ticketId: v.id("ticketIssued") },
  handler: async (ctx, { code, eventKey, ticketId }) => {
    const allowed = await scannerLinkEventAuthorizeFn(ctx, code, eventKey)
    if (!allowed.success) return allowed
    const ticket = await ctx.db.get(ticketId)
    if (!ticket || ticket.eventKey !== eventKey)
      return createResultError("scannerLinkEventTicketGetQuery", "Ticket unavailable")
    const order = await ctx.db.get(ticket.orderId)
    if (!order || order.eventKey !== eventKey)
      return createResultError("scannerLinkEventTicketGetQuery", "Ticket unavailable")
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (!event) return createResultError("scannerLinkEventTicketGetQuery", "Event unavailable")
    return createResult(organizerTicketProjectionCreate(ticket, order, event))
  },
})
