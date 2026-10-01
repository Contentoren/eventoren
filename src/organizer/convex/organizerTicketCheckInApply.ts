import type { MutationCtx } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, type PromiseResult } from "#result"
import { organizerTicketCheckInErrorCreate } from "./organizerTicketCheckInErrorCreate.js"
import { organizerTicketProjectionCreate } from "./organizerTicketProjectionCreate.js"

type CheckInActor = { user: Doc<"users">; link?: never } | { link: Doc<"scannerLinks">; user?: never }
type CheckInTarget = { event: Doc<"catalogEvents">; ticket: Doc<"ticketIssued">; order: Doc<"ticketOrders"> }

export async function organizerTicketCheckInApply(
  ctx: MutationCtx,
  target: CheckInTarget,
  actor: CheckInActor,
  op: string,
): PromiseResult<{
  status: "checked-in"
  historyId: Id<"ticketCheckInHistory">
  ticket: ReturnType<typeof organizerTicketProjectionCreate>
}> {
  const { event, order, ticket } = target
  if (order.status !== "paid" || order.paymentStatus !== "paid")
    return organizerTicketCheckInErrorCreate(op, "organizer.check-in.unpaid", "The ticket order is not paid", {
      eventKey: event.eventKey,
      ticketId: ticket._id,
      ticketNumber: ticket.code,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
    })
  if (ticket.cancelled === true)
    return organizerTicketCheckInErrorCreate(op, "organizer.check-in.cancelled", "The ticket is cancelled", {
      eventKey: event.eventKey,
      ticketId: ticket._id,
      ticketNumber: ticket.code,
    })
  if (ticket.checkedInAt !== undefined) return organizerTicketCheckInDuplicateErrorCreate(op, ticket, order, event)

  const now = new Date().toISOString()
  const operatorName = actor.link?.name ?? (actor.user?.name.trim() || actor.user?.email?.trim() || "Unknown operator")
  const ticketProjection = organizerTicketProjectionCreate(ticket, order, event)
  await ctx.db.patch("ticketIssued", ticket._id, {
    checkedInAt: now,
    checkedOutAt: undefined,
    checkedInBy: actor.user?._id,
    checkedInByName: operatorName,
  })
  const historyId = await ctx.db.insert("ticketCheckInHistory", {
    ticketId: ticket._id,
    orderId: order._id,
    eventKey: event.eventKey,
    ticketNumber: ticket.code,
    action: "check_in",
    occurredAt: now,
    checkInAt: now,
    operatorId: actor.user?._id,
    operatorName,
    linkId: actor.link?._id,
    linkName: actor.link?.name,
    participantName: ticketProjection.participantName,
    buyerName: ticketProjection.buyerName,
    buyerEmail: order.customerEmail,
  })
  const updatedTicket = await ctx.db.get("ticketIssued", ticket._id)
  if (!updatedTicket)
    return organizerTicketCheckInErrorCreate(op, "organizer.check-in.invalid-ticket", "The ticket disappeared")
  console.info("Ticket checked in", {
    eventKey: event.eventKey,
    ticketId: ticket._id,
    historyId,
    linkId: actor.link?._id,
  })
  return createResult({
    status: "checked-in",
    historyId,
    ticket: organizerTicketProjectionCreate(updatedTicket, order, event),
  })
}

function organizerTicketCheckInDuplicateErrorCreate(
  op: string,
  ticket: Doc<"ticketIssued">,
  order: Doc<"ticketOrders">,
  event: Doc<"catalogEvents">,
) {
  const previousCheckedInAt = ticket.checkedInAt
  if (previousCheckedInAt === undefined)
    return organizerTicketCheckInErrorCreate(op, "organizer.check-in.invalid-ticket", "The ticket is not checked in")
  const previousOperator = ticket.checkedInByName ?? "Unknown operator"
  const ticketProjection = organizerTicketProjectionCreate(ticket, order, event)
  const timestamp = Date.parse(previousCheckedInAt)
  const elapsedMilliseconds = Number.isFinite(timestamp) ? Math.max(0, Date.now() - timestamp) : null
  const totalSeconds = elapsedMilliseconds === null ? null : Math.floor(elapsedMilliseconds / 1000)
  const elapsedText =
    totalSeconds === null ? "unknown elapsed time" : `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
  return organizerTicketCheckInErrorCreate(
    op,
    "organizer.check-in.duplicate",
    `Ticket ${ticket.code} was already checked in at ${previousCheckedInAt} (${elapsedText} ago) by ${previousOperator}; participant ${ticketProjection.participantName}; buyer ${ticketProjection.buyerName} <${order.customerEmail}>; ticket ${ticket.code}`,
    {
      eventKey: event.eventKey,
      ticketId: ticket._id,
      ticketNumber: ticket.code,
      previousCheckedInAt,
      previousOperator,
      previousOperatorId: ticket.checkedInBy ?? null,
      participantName: ticketProjection.participantName,
      buyerName: ticketProjection.buyerName,
      buyerEmail: order.customerEmail,
      elapsedMilliseconds,
    },
  )
}
