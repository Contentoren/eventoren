import { expect, test } from "@rstest/core"
import { ticketPurchaseCheckinProofCheck } from "./ticketPurchaseCheckinProofCheck.ts"

function proofCreate() {
  const runId = "abc-12345678-1234-1234-1234-123456789abc"
  const eventKey = `ticket-e2e-${runId}`
  const participantName = `E2E Participant ${runId}`
  const at = "2026-10-14T07:00:00.000Z"
  const code = "TKT-0123456789ABCDEF0123"
  return {
    runId,
    eventKey,
    participantName,
    orderId: "order-1",
    ticketId: "ticket-1",
    code,
    ticket: { id: "ticket-1", eventKey, participantName, code, checkedIn: true, checkedInAt: at, cancelled: false },
    history: [
      {
        ticketId: "ticket-1",
        orderId: "order-1",
        eventKey,
        participantName,
        action: "check_in",
        occurredAt: at,
        checkInAt: at,
      },
    ],
  }
}

test("adopts only the exact delivered QR and single persisted check-in linked to its saved order", () => {
  expect(ticketPurchaseCheckinProofCheck(proofCreate())).toEqual({ success: true, data: "ticket-1" })
})

test.each([
  "event",
  "participant",
  "saved ticket",
  "QR",
  "unchecked",
  "cancelled",
  "missing history",
  "different order",
  "duplicate history",
  "checkout history",
  "timestamp",
])("retains uncertain check-in without adoption when %s evidence conflicts", (kind) => {
  const input = proofCreate()
  if (kind === "event") input.eventKey = "foreign-event"
  if (kind === "participant") input.ticket.participantName = "Other participant"
  if (kind === "QR") input.ticket.code = "TKT-AAAAAAAAAAAAAAAAAAAA"
  if (kind === "unchecked") input.ticket.checkedIn = false
  if (kind === "cancelled") input.ticket.cancelled = true
  if (kind === "missing history") input.history = []
  if (kind === "different order") input.history[0]!.orderId = "foreign-order"
  if (kind === "duplicate history") input.history.push({ ...input.history[0]! })
  if (kind === "checkout history") input.history[0]!.action = "check_out"
  if (kind === "timestamp") input.history[0]!.checkInAt = "2026-10-14T08:00:00.000Z"
  expect(
    ticketPurchaseCheckinProofCheck({
      ...input,
      ...(kind === "saved ticket" ? { savedTicketId: "foreign-ticket" } : {}),
    }).success,
  ).toBe(false)
})
