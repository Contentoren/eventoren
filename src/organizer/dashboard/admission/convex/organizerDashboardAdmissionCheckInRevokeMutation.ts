import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerTicketCheckInTargetResolve } from "#src/organizer/convex/organizerTicketCheckInTargetResolve.ts"
import { organizerTicketProjectionCreate } from "#src/organizer/convex/organizerTicketProjectionCreate.ts"
import type { Id } from "#convex/_generated/dataModel.js"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { organizerDashboardAdmissionCheckInSchema } from "../model/organizerDashboardAdmissionCheckInSchema.ts"
import type { OrganizerDashboardAdmissionScanResult } from "../model/organizerDashboardAdmissionScanResultSchema.ts"
import { organizerDashboardAdmissionScopeGet } from "./organizerDashboardAdmissionScopeGet.ts"
import { organizerDashboardAdmissionScanResultOf } from "./organizerDashboardAdmissionScanResultOf.ts"

/**
 * Manual check-in revoke (Rücknahme) by an organizer with `einlass.nutzen`.
 * Mirrors the canonical reset: clears the check-in, keeps a reset history row
 * and logs the revoke in the admission scan log.
 */
export const organizerDashboardAdmissionCheckInRevokeMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    entrance: v.string(),
    ticketCode: v.optional(v.string()),
    ticketId: v.optional(v.id("ticketIssued")),
  },
  handler: (ctx, args): PromiseResult<unknown> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, ...input }) => {
      const op = "organizerDashboardAdmissionCheckInRevokeMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "einlass.nutzen")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardAdmissionCheckInSchema, {
        ...input,
        ...(input.ticketId !== undefined ? { ticketId: String(input.ticketId) } : {}),
      })
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const { eventKey, entrance, ticketCode } = parsed.output
      const ticketId = input.ticketId as Id<"ticketIssued"> | undefined
      if ((ticketCode === undefined) === (ticketId === undefined)) {
        return createResultError(op, "Genau einen Ticketcode oder eine Ticket-ID angeben")
      }
      const scope = await organizerDashboardAdmissionScopeGet(mutationCtx, orgId, eventKey, op)
      if (!scope.success) return scope
      const resolved = await organizerTicketCheckInTargetResolve(
        mutationCtx,
        scope.data,
        {
          ...(ticketCode !== undefined ? { ticketCode } : {}),
          ...(ticketId !== undefined ? { ticketId } : {}),
        },
        op,
      )
      const at = new Date().toISOString()
      const log = async (result: OrganizerDashboardAdmissionScanResult, reason?: string) => {
        await mutationCtx.db.insert("organizerDashboardAdmissionScans", {
          orgId,
          eventKey,
          ...(resolved.success ? { ticketId: resolved.data.ticket._id } : {}),
          ticketCode: resolved.success ? resolved.data.ticket.code : (ticketCode ?? ""),
          entrance,
          action: "reset",
          result,
          ...(reason ? { reason } : {}),
          actorUserId: String(userId),
          at,
        })
      }
      if (!resolved.success) {
        await log(organizerDashboardAdmissionScanResultOf(resolved.code), resolved.code)
        return resolved
      }
      const { event, order, ticket } = resolved.data
      if (ticket.checkedInAt === undefined) {
        await log("unbekannt", "organizer.check-in.not-checked-in")
        return createResultError(op, "Ticket ist nicht eingecheckt")
      }
      const user = await mutationCtx.db.get("users", userId)
      if (!user) return createResultError(op, "User not found")
      const operatorName = user.name.trim() || user.email?.trim() || "Unknown operator"
      const ticketProjection = organizerTicketProjectionCreate(ticket, order, event)
      await mutationCtx.db.patch("ticketIssued", ticket._id, {
        checkedInAt: undefined,
        checkedOutAt: at,
        checkedInBy: undefined,
        checkedInByName: undefined,
      })
      const historyId = await mutationCtx.db.insert("ticketCheckInHistory", {
        ticketId: ticket._id,
        orderId: order._id,
        eventKey: event.eventKey,
        ticketNumber: ticket.code,
        action: "reset",
        occurredAt: at,
        checkInAt: ticket.checkedInAt,
        operatorId: user._id,
        operatorName,
        participantName: ticketProjection.participantName,
        buyerName: ticketProjection.buyerName,
        buyerEmail: order.customerEmail,
      })
      await log("ok")
      const updatedTicket = await mutationCtx.db.get("ticketIssued", ticket._id)
      if (!updatedTicket) return createResultError(op, "Ticket nicht gefunden.")
      return createResult({
        status: "reset" as const,
        historyId,
        ticket: organizerTicketProjectionCreate(updatedTicket, order, event),
      })
    }),
})
