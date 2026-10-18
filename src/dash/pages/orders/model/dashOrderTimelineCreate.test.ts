import { describe, expect, test } from "bun:test"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashOrderTimelineCreate } from "./dashOrderTimelineCreate.ts"

function orderFixture(partial: Partial<DashOrder>): DashOrder {
  return {
    id: "o-1",
    number: "EV-1",
    orgId: "org-1",
    eventId: "ev-1",
    channel: "online",
    createdAt: "2026-10-10T10:00:00.000Z",
    buyer: { firstName: "Anna", lastName: "Muster", email: "anna@example.de" },
    status: "teilerstattet",
    payment: { method: "karte", costCents: 0 },
    lines: [
      { ticketTypeId: "tt-1", phaseId: "ph-1", name: "Standard", unitPriceCents: 2500, quantity: 2, taxRateBps: 1900 },
    ],
    discount: null,
    voucher: null,
    serviceFeeCents: 100,
    totalCents: 5100,
    refunds: [
      {
        id: "r-1",
        amountCents: 2500,
        feeCents: 0,
        reason: "Teilerstattung",
        at: "2026-10-12T09:00:00.000Z",
        ticketIds: ["t-2"],
      },
    ],
    chargeback: { amountCents: 2600, feeCents: 1500, at: "2026-10-13T09:00:00.000Z" },
    notes: [{ id: "n-1", text: "Rückruf gewünscht", author: "Mara Lindner", at: "2026-10-11T08:00:00.000Z" }],
    emails: [
      { at: "2026-10-10T10:01:00.000Z", to: "anna@example.de", kind: "bestaetigung" },
      { at: "2026-10-10T10:02:00.000Z", to: "anna@example.de", kind: "tickets" },
    ],
    invoiceNumber: "R-1",
    ...partial,
  }
}

function ticketFixture(partial: Partial<DashTicket> & { id: string }): DashTicket {
  return {
    orderId: "o-1",
    eventId: "ev-1",
    ticketTypeId: "tt-1",
    code: "T-ABCD-1234",
    holderName: "Anna Muster",
    holderEmail: "anna@example.de",
    status: "gueltig",
    checkedInAt: null,
    entrance: null,
    ...partial,
  }
}

describe("dashOrderTimelineCreate", () => {
  test("enthält alle Ereignisarten in chronologischer Reihenfolge", () => {
    const entries = dashOrderTimelineCreate({
      order: orderFixture({}),
      tickets: [
        ticketFixture({
          id: "t-1",
          holderName: "Anna Muster",
          checkedInAt: "2026-10-11T19:00:00.000Z",
          entrance: "Haupteingang",
        }),
        ticketFixture({ id: "t-2", holderName: "Jonas Muster", checkedInAt: null }),
      ],
    })
    const kinds = entries.map((entry) => entry.kind)
    expect(kinds).toEqual(["bestellt", "bezahlt", "email", "email", "notiz", "checkin", "erstattung", "rueckbuchung"])
    const times = entries.map((entry) => Date.parse(entry.at))
    expect([...times].sort((a, b) => a - b)).toEqual(times)
    expect(entries.find((entry) => entry.kind === "checkin")?.detail).toBe("Haupteingang")
  })

  test("offene Bestellung hat keinen Bezahlt-Eintrag, stornierte keine Check-ins ohne Zeit", () => {
    const entries = dashOrderTimelineCreate({
      order: orderFixture({ status: "offen", refunds: [], chargeback: null, notes: [], emails: [] }),
      tickets: [ticketFixture({ id: "t-1" })],
    })
    expect(entries.map((entry) => entry.kind)).toEqual(["bestellt"])
  })
})
