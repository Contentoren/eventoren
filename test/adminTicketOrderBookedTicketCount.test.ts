import { expect, test } from "bun:test"
import type { AdminTicketOrderSummary } from "../src/admin/AdminTicketOrderSummary.ts"
import { adminTicketOrderBookedTicketCount } from "../src/admin/adminTicketOrderBookedTicketCount.ts"

const order: AdminTicketOrderSummary = {
  id: "order",
  customerEmail: "buyer@example.com",
  eventKey: "event",
  eventStartsAt: "2026-10-21T18:00:00Z",
  eventTitle: "Event",
  paymentReference: "reference",
  paymentStatus: "paid",
  status: "paid",
  stripeMode: "test",
  totalCents: 5000,
  createdAt: "2026-10-20T18:00:00Z",
  updatedAt: "2026-10-20T18:00:00Z",
  ticketCount: 5,
}

test("paid tickets count even when the internal reservation status is released", () => {
  expect(adminTicketOrderBookedTicketCount(order)).toBe(5)
  expect(adminTicketOrderBookedTicketCount({ ...order, status: "released" })).toBe(5)
})

test("SEPA processing tickets count while unpaid reservations do not", () => {
  const pending = { ...order, paymentStatus: "pending", status: "reserved" } as const
  expect(adminTicketOrderBookedTicketCount(pending)).toBe(0)
  expect(adminTicketOrderBookedTicketCount({ ...pending, ticketsIssuedAt: order.createdAt })).toBe(5)
})

test("failed and expired payments do not count even if tickets were issued", () => {
  for (const paymentStatus of ["failed", "expired"] as const) {
    expect(adminTicketOrderBookedTicketCount({ ...order, paymentStatus, ticketsIssuedAt: order.createdAt })).toBe(0)
  }
})
