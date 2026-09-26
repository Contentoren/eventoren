import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, type PromiseResult } from "#result"
import { organizerTicketCheckInErrorCreate } from "./organizerTicketCheckInErrorCreate.js"

export async function organizerTicketCheckInTargetResolve(
  ctx: { db: DatabaseReader },
  event: Doc<"catalogEvents">,
  target: { ticketCode?: string; ticketId?: Id<"ticketIssued"> },
  op: string,
): PromiseResult<{ event: Doc<"catalogEvents">; ticket: Doc<"ticketIssued">; order: Doc<"ticketOrders"> }> {
  const hasTicketCode = target.ticketCode !== undefined
  const hasTicketId = target.ticketId !== undefined
  if (hasTicketCode === hasTicketId)
    return organizerTicketCheckInErrorCreate(
      op,
      "organizer.check-in.invalid-target",
      "Provide exactly one ticket code or ticket id",
    )

  let ticket: Doc<"ticketIssued"> | undefined
  if (target.ticketId !== undefined) {
    ticket = (await ctx.db.get(target.ticketId)) ?? undefined
    if (!ticket)
      return organizerTicketCheckInErrorCreate(op, "organizer.check-in.unknown-ticket", "The ticket was not found", {
        ticketId: target.ticketId,
      })
  } else {
    const ticketCode = target.ticketCode?.trim() ?? ""
    if (ticketCode.length === 0 || ticketCode.length > 128)
      return organizerTicketCheckInErrorCreate(op, "organizer.check-in.invalid-code", "The ticket code is invalid")

    const matchingTickets = await ctx.db
      .query("ticketIssued")
      .withIndex("code", (q) => q.eq("code", ticketCode))
      .take(2)
    if (matchingTickets.length > 1)
      return organizerTicketCheckInErrorCreate(
        op,
        "organizer.check-in.ambiguous-ticket-code",
        "The ticket code is assigned to more than one ticket",
        { ticketCode, ticketIds: matchingTickets.map((candidate) => candidate._id) },
      )
    ticket = matchingTickets[0]
    if (!ticket) {
      const orderMatches = await ctx.db
        .query("ticketOrders")
        .withIndex("checkoutKey", (q) => q.eq("checkoutKey", ticketCode))
        .take(1)
      if (orderMatches.length > 0)
        return organizerTicketCheckInErrorCreate(
          op,
          "organizer.check-in.order-code-not-accepted",
          "Order codes cannot check in tickets; scan or enter an individual ticket code",
          { ticketCode, orderIds: orderMatches.map((order) => order._id) },
        )
      return organizerTicketCheckInErrorCreate(
        op,
        "organizer.check-in.unknown-ticket",
        "The ticket code was not found",
        {
          ticketCode,
        },
      )
    }
  }

  if (ticket.eventKey !== event.eventKey)
    return organizerTicketCheckInErrorCreate(
      op,
      "organizer.check-in.wrong-event",
      "The ticket belongs to another event",
      {
        eventKey: event.eventKey,
        ticketEventKey: ticket.eventKey,
        ticketId: ticket._id,
        ticketNumber: ticket.code,
      },
    )

  const order = await ctx.db.get(ticket.orderId)
  if (!order)
    return organizerTicketCheckInErrorCreate(
      op,
      "organizer.check-in.invalid-ticket",
      "The ticket order was not found",
      {
        ticketId: ticket._id,
        ticketNumber: ticket.code,
      },
    )
  if (order.eventKey !== event.eventKey)
    return organizerTicketCheckInErrorCreate(
      op,
      "organizer.check-in.wrong-event",
      "The ticket belongs to another event",
      {
        eventKey: event.eventKey,
        ticketEventKey: order.eventKey,
        ticketId: ticket._id,
        ticketNumber: ticket.code,
      },
    )

  return createResult({ event, ticket, order })
}
