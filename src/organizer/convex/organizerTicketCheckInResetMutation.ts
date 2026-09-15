import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerTicketCheckInErrorCreate } from "./organizerTicketCheckInErrorCreate.js"
import { organizerTicketCheckInTicketResolve } from "./organizerTicketCheckInTicketResolve.js"
import { organizerTicketProjectionCreate } from "./organizerTicketProjectionCreate.js"

type OrganizerTicketCheckInResetResult = {
  status: "reset"
  historyId: Id<"ticketCheckInHistory">
  ticket: ReturnType<typeof organizerTicketProjectionCreate>
}

export const organizerTicketCheckInResetMutation = mutation({
  args: {
    eventKey: v.string(),
    ticketCode: v.optional(v.string()),
    ticketId: v.optional(v.id("ticketIssued")),
    token: v.string(),
  },
  handler: async (ctx, args): PromiseResult<OrganizerTicketCheckInResetResult> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId }) => {
      const op = "organizerTicketCheckInResetMutation"
      const resolved = await organizerTicketCheckInTicketResolve(mutationCtx, userId, args, op)
      if (!resolved.success) return resolved

      const { event, order, ticket, user } = resolved.data
      if (ticket.checkedInAt === undefined)
        return organizerTicketCheckInErrorCreate(
          op,
          "organizer.check-in.not-checked-in",
          "The ticket is not checked in",
          {
            eventKey: event.eventKey,
            ticketId: ticket._id,
            ticketNumber: ticket.code,
          },
        )

      const now = new Date().toISOString()
      const operatorName = user.name.trim() || user.email?.trim() || "Unknown operator"
      const ticketProjection = organizerTicketProjectionCreate(ticket, order, event)
      await mutationCtx.db.patch("ticketIssued", ticket._id, {
        checkedInAt: undefined,
        checkedInBy: undefined,
        checkedInByName: undefined,
      })
      const historyId = await mutationCtx.db.insert("ticketCheckInHistory", {
        ticketId: ticket._id,
        orderId: order._id,
        eventKey: event.eventKey,
        ticketNumber: ticket.code,
        action: "reset",
        occurredAt: now,
        checkInAt: ticket.checkedInAt,
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
        status: "reset" as const,
        historyId,
        ticket: organizerTicketProjectionCreate(updatedTicket, order, event),
      })
    }),
})
