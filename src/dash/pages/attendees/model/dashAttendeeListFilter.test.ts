import { describe, expect, test } from "bun:test"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashAttendeeListFilter } from "./dashAttendeeListFilter.ts"

function ticketFixture(partial: Partial<DashTicket> & { id: string }): DashTicket {
  return {
    orderId: "o-1",
    eventId: "ev-indie-night",
    ticketTypeId: "tt-1",
    code: "T-AAAA-1111",
    holderName: "Anna Muster",
    holderEmail: "anna@example.de",
    status: "gueltig",
    checkedInAt: null,
    entrance: null,
    ...partial,
  }
}

function orderFixture(partial: Partial<DashOrder> & { id: string }): DashOrder {
  return {
    number: "EV-1",
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    channel: "online",
    createdAt: "2026-10-10T10:00:00.000Z",
    buyer: { firstName: "Anna", lastName: "Muster", email: "anna@example.de" },
    status: "bezahlt",
    payment: { method: "karte", costCents: 0 },
    lines: [],
    discount: null,
    voucher: null,
    serviceFeeCents: 0,
    totalCents: 2500,
    refunds: [],
    chargeback: null,
    notes: [],
    emails: [],
    invoiceNumber: "R-1",
    ...partial,
  }
}

const base = {
  orders: [orderFixture({ id: "o-1" }), orderFixture({ id: "o-2", channel: "abendkasse" })],
  ticketTypeName: (id: string) => (id === "tt-1" ? "Stehplatz" : "VIP"),
  q: "",
  ticketart: "",
  checkin: "alle" as const,
  kanal: "alle" as const,
}

describe("dashAttendeeListFilter", () => {
  test("eine Zeile je Ticket, alphabetisch, alle Kanäle inklusive storniert", () => {
    const tickets = [
      ticketFixture({ id: "t-2", holderName: "Zoe Berger", orderId: "o-2" }),
      ticketFixture({ id: "t-1", holderName: "Anna Muster", orderId: "o-1" }),
      ticketFixture({
        id: "t-3",
        holderName: "Max Storno",
        orderId: "o-1",
        status: "storniert",
        code: "T-BBBB-2222",
      }),
    ]
    const result = dashAttendeeListFilter({ ...base, tickets })
    expect(result.rows.map((row) => row.ticket.id)).toEqual(["t-1", "t-3", "t-2"])
    expect(result.total).toBe(3)
    expect(result.counts).toEqual({ alle: 3, eingecheckt: 0, offen: 3 })
  })

  test("sucht über Name, E-Mail und Code", () => {
    const tickets = [
      ticketFixture({ id: "t-1", holderName: "Anna Muster", holderEmail: "anna@example.de" }),
      ticketFixture({
        id: "t-2",
        holderName: "Jonas Weber",
        holderEmail: "jonas@example.de",
        code: "T-CCCC-3333",
      }),
    ]
    expect(dashAttendeeListFilter({ ...base, tickets, q: "jonas" }).rows.map((row) => row.ticket.id)).toEqual(["t-2"])
    expect(dashAttendeeListFilter({ ...base, tickets, q: "anna@example" }).rows.map((row) => row.ticket.id)).toEqual([
      "t-1",
    ])
    expect(dashAttendeeListFilter({ ...base, tickets, q: "cccc-3333" }).rows.map((row) => row.ticket.id)).toEqual([
      "t-2",
    ])
  })

  test("filtert nach Check-in, Ticketart und Kanal", () => {
    const tickets = [
      ticketFixture({ id: "t-1", checkedInAt: "2026-10-18T18:14:00.000Z", entrance: "Haupteingang" }),
      ticketFixture({ id: "t-2", ticketTypeId: "tt-2", orderId: "o-2" }),
    ]
    expect(
      dashAttendeeListFilter({ ...base, tickets, checkin: "eingecheckt" }).rows.map((row) => row.ticket.id),
    ).toEqual(["t-1"])
    expect(dashAttendeeListFilter({ ...base, tickets, checkin: "offen" }).rows.map((row) => row.ticket.id)).toEqual([
      "t-2",
    ])
    expect(dashAttendeeListFilter({ ...base, tickets, ticketart: "tt-2" }).rows.map((row) => row.ticket.id)).toEqual([
      "t-2",
    ])
    expect(dashAttendeeListFilter({ ...base, tickets, kanal: "abendkasse" }).rows.map((row) => row.ticket.id)).toEqual([
      "t-2",
    ])
  })
})
