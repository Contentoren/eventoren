import { ConvexHttpClient } from "convex/browser"
import type { Id } from "../../../convex/_generated/dataModel.js"
import { api } from "../../../convex/_generated/api.js"
import { createResultError, type PromiseResult } from "#result"
import * as v from "valibot"
import { e2eTicketBackendResolve } from "../../config/e2eTicketBackendResolve.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseCheckinProofCheck } from "./ticketPurchaseCheckinProofCheck.ts"

export async function ticketPurchaseCheckinProofRead(
  context: TicketPurchaseContext,
  ticketId: string,
  code: string,
): PromiseResult<string> {
  const op = "ticketPurchaseCheckinProofRead"
  if (context.checkpoint.target !== "development" || !context.checkpoint.ticket.orderId)
    return createResultError(op, "Development saved-order evidence required")
  const backend = e2eTicketBackendResolve(process.env)
  if (!backend.success) return backend
  if (backend.data.baseUrl !== context.baseUrl || context.checkpoint.baseUrl !== context.baseUrl)
    return createResultError(op, "Check-in proof target does not match the checkpoint")
  const client = new ConvexHttpClient(backend.data.convexUrl)
  try {
    const session = await context.page.evaluate(async () => {
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      if (!response.ok) return null
      return response.json()
    })
    const parsed = v.safeParse(v.object({ session: v.object({ token: v.pipe(v.string(), v.minLength(1)) }) }), session)
    if (!parsed.success) return createResultError(op, "Admin session proof unavailable")
    const token = parsed.output.session.token
    const saved = context.checkpoint.ticket
    const order = await client.query(api.ticketing.ticketE2eOrderProofQuery, {
      token,
      orderId: saved.orderId!,
      eventKey: saved.eventKey,
      runId: context.checkpoint.runId,
      runCreatedAt: context.checkpoint.createdAt,
    })
    if (!order.success) return order
    if (order.data.status !== "paid" || order.data.paymentStatus !== "paid")
      return createResultError(op, "Exact run-owned test order is not paid")
    const args = { token, eventKey: saved.eventKey, ticketId: ticketId as Id<"ticketIssued"> }
    const ticket = await client.query(api.organizer.organizerEventTicketGetQuery, args)
    if (!ticket.success) return ticket
    const history = await client.query(api.organizer.organizerTicketCheckInHistoryQuery, args)
    if (!history.success) return history
    return ticketPurchaseCheckinProofCheck({
      runId: context.checkpoint.runId,
      eventKey: saved.eventKey,
      participantName: saved.participantName,
      orderId: saved.orderId!,
      ticketId,
      savedTicketId: saved.ticketId,
      code,
      ticket: ticket.data,
      history: history.data,
    })
  } catch {
    return createResultError(op, "Exact check-in proof unavailable; checkpoint retained without mutation")
  }
}
