import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { organizerAuthorizeFn } from "./organizerAuthorizeFn.js"
import { organizerTicketCheckInErrorCreate } from "./organizerTicketCheckInErrorCreate.js"

type CheckInTarget = {
  eventKey: string
  ticketCode?: string
  ticketId?: Id<"ticketIssued">
}

type CheckInTicketContext = {
  user: Doc<"users">
  event: Doc<"catalogEvents">
  ticket: Doc<"ticketIssued">
  order: Doc<"ticketOrders">
}

export async function organizerTicketCheckInTicketResolve(
  ctx: { db: DatabaseReader },
  userId: IdUser,
  target: CheckInTarget,
  op: string,
): PromiseResult<CheckInTicketContext> {
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
      .collect()
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
        .collect()
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

  return createResult({ user: eventAuthorization.data, event, ticket, order })
}
