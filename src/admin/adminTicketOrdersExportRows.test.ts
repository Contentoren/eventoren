import { expect, test } from "bun:test"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import { adminTicketOrdersExportRows } from "./adminTicketOrdersExportRows.ts"

const text = {
  bookingReference: (order: AdminTicketOrderSummary) => order.bookingReference,
  customerName: (order: AdminTicketOrderSummary) => order.customerGivenName ?? "?",
  dateFormat: (value: string) => `datum:${value}`,
  eventTitle: (order: AdminTicketOrderSummary) => order.eventTitle,
  paymentLabel: () => "Bezahlt" as const,
  paymentMethodLabel: (paymentMethodType?: string | null) => paymentMethodType ?? "—",
  priceFormat: (cents: number) => `${cents / 100} €`,
}

function orderFixture(partial: Partial<AdminTicketOrderSummary> & { readonly id: string }): AdminTicketOrderSummary {
  return {
    customerEmail: "a@example.de",
    customerGivenName: "Anna",
    eventKey: "event-1",
    eventStartsAt: "2026-10-26T19:00:00.000Z",
    eventTitle: "Demo-Konzert",
    paymentReference: `pi_${partial.id}`,
    paymentStatus: "paid",
    status: "paid",
    stripeMode: "test",
    ticketCount: 2,
    totalCents: 5000,
    createdAt: "2026-10-18T10:00:00.000Z",
    updatedAt: "2026-10-18T10:00:00.000Z",
    ...partial,
  }
}

test("export rows include header plus voucher columns", () => {
  const rows = adminTicketOrdersExportRows(
    [
      orderFixture({
        id: "a",
        bookingReference: "00042",
        voucher: { voucherId: "vou-1", code: "GS-10", amountCents: 1000 },
        paymentMethodType: "card",
      }),
      orderFixture({ id: "b", totalCents: 2000 }),
    ],
    text,
  )
  expect(rows[0]).toEqual([
    "Nummer",
    "Käufer",
    "E-Mail",
    "Event",
    "Tickets",
    "Betrag",
    "Gutschein-Code",
    "Gutschein-Betrag",
    "Zahlart",
    "Datum",
    "Status",
  ])
  expect(rows[1]).toEqual([
    "00042",
    "Anna",
    "a@example.de",
    "Demo-Konzert",
    "2",
    "50 €",
    "GS-10",
    "10 €",
    "card",
    "datum:2026-10-18T10:00:00.000Z",
    "Bezahlt",
  ])
  expect(rows[2]?.slice(0, 6)).toEqual(["pi_b", "Anna", "a@example.de", "Demo-Konzert", "2", "20 €"])
  expect(rows[2]?.slice(6, 8)).toEqual(["", ""])
})
