import { createResult, createResultError } from "#result"

export function ticketPurchaseCheckinProofCheck(input: {
  runId: string
  eventKey: string
  participantName: string
  orderId: string
  ticketId: string
  savedTicketId?: string
  code: string
  ticket: {
    id: string
    eventKey: string
    participantName: string
    code: string
    checkedIn: boolean
    checkedInAt: string | null
    cancelled: boolean
  }
  history: readonly {
    ticketId: string
    orderId: string
    eventKey: string
    participantName: string
    action: string
    occurredAt: string
    checkInAt: string
  }[]
}) {
  const op = "ticketPurchaseCheckinProofCheck"
  if (
    input.eventKey !== `ticket-e2e-${input.runId}` ||
    input.participantName !== `E2E Participant ${input.runId}` ||
    !input.orderId ||
    !input.ticketId ||
    (input.savedTicketId && input.savedTicketId !== input.ticketId) ||
    !/^TKT-[0-9A-F]{20}$/u.test(input.code)
  )
    return createResultError(op, "Exact run/ticket evidence missing or mismatched")
  const ticket = input.ticket
  if (
    ticket.id !== input.ticketId ||
    ticket.eventKey !== input.eventKey ||
    ticket.participantName !== input.participantName ||
    ticket.code !== input.code ||
    ticket.cancelled !== false ||
    ticket.checkedIn !== true ||
    !ticket.checkedInAt ||
    !Number.isFinite(Date.parse(ticket.checkedInAt))
  )
    return createResultError(op, "Exact delivered ticket is not proven checked in")
  // This test performs exactly one check-in and never checks out. Require
  // complete, single-entry history linking the issued QR to the saved order.
  const entry = input.history[0]
  if (
    input.history.length !== 1 ||
    !entry ||
    entry.ticketId !== input.ticketId ||
    entry.orderId !== input.orderId ||
    entry.eventKey !== input.eventKey ||
    entry.participantName !== input.participantName ||
    entry.action !== "check_in" ||
    entry.checkInAt !== ticket.checkedInAt ||
    entry.occurredAt !== ticket.checkedInAt
  )
    return createResultError(op, "Exact single check-in history/order correlation missing")
  return createResult(input.ticketId)
}
