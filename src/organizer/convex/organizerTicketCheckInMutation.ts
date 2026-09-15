import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerTicketProjectionCreate } from "./organizerTicketProjectionCreate.js"
import { organizerTicketCheckInErrorCreate } from "./organizerTicketCheckInErrorCreate.js"
import { organizerTicketCheckInTicketResolve } from "./organizerTicketCheckInTicketResolve.js"

type OrganizerTicketCheckInResult = {
  status: "checked-in"
  historyId: Id<"ticketCheckInHistory">
  ticket: ReturnType<typeof organizerTicketProjectionCreate>
}

export const organizerTicketCheckInMutation = mutation({
  args: {
    eventKey: v.string(),
    ticketCode: v.optional(v.string()),
    ticketId: v.optional(v.id("ticketIssued")),
    token: v.string(),
  },
  handler: async (ctx, args): PromiseResult<OrganizerTicketCheckInResult> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId }) => {
      const op = "organizerTicketCheckInMutation"
      const resolved = await organizerTicketCheckInTicketResolve(mutationCtx, userId, args, op)
      if (!resolved.success) return resolved

      const { event, order, ticket, user } = resolved.data
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
      const operatorName = organizerOperatorNameCreate(user.name, user.email)
      const ticketProjection = organizerTicketProjectionCreate(ticket, order, event)
      await mutationCtx.db.patch("ticketIssued", ticket._id, {
        checkedInAt: now,
        checkedInBy: user._id,
        checkedInByName: operatorName,
      })
      const historyId = await mutationCtx.db.insert("ticketCheckInHistory", {
        ticketId: ticket._id,
        orderId: order._id,
        eventKey: event.eventKey,
        ticketNumber: ticket.code,
        action: "check_in",
        occurredAt: now,
        checkInAt: now,
        operatorId: user._id,
        operatorName,
        participantName: ticketProjection.participantName,
        buyerName: ticketProjection.buyerName,
        buyerEmail: order.customerEmail,
      })
      const updatedTicket = await mutationCtx.db.get(ticket._id)
      if (!updatedTicket)
        return organizerTicketCheckInErrorCreate(op, "organizer.check-in.invalid-ticket", "The ticket disappeared")
      return createResult({
        status: "checked-in" as const,
        historyId,
        ticket: organizerTicketProjectionCreate(updatedTicket, order, event),
      })
    }),
})

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
  const elapsedMilliseconds = organizerElapsedMillisecondsCreate(previousCheckedInAt)
  const elapsedText = organizerElapsedTextCreate(elapsedMilliseconds)
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

function organizerOperatorNameCreate(name: string, email: string | undefined): string {
  return name.trim() || email?.trim() || "Unknown operator"
}

function organizerElapsedMillisecondsCreate(value: string): number | null {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  return Math.max(0, Date.now() - timestamp)
}

function organizerElapsedTextCreate(value: number | null): string {
  if (value === null) return "unknown elapsed time"
  const totalSeconds = Math.floor(value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}
