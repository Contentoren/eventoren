import { describe, expect, test } from "bun:test"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashAttendeeExportRowsCreate } from "./dashAttendeeExportRows.ts"
import { dashAttendeeListFilter } from "./dashAttendeeListFilter.ts"

const seedNow = new Date("2026-10-18T18:00:00+02:00")

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

describe("dashAttendeeExportRowsCreate", () => {
  test("Teilnehmerliste nutzt den Filter, Bestellungen und Check-ins alle", () => {
    const state = dashSeedCreate(seedNow)
    const event = state.events.find((entry) => entry.id === "ev-indie-night") as DashEvent
    const orders = state.orders.filter((order) => order.eventId === event.id)
    const firstOrder = orders[0] as DashOrder
    const tickets = [
      ticketFixture({ id: "t-1", orderId: firstOrder.id, holderName: "Anna Muster", code: "T-AAAA-1111" }),
      ticketFixture({
        id: "t-2",
        orderId: firstOrder.id,
        holderName: "Zoe Berger",
        holderEmail: "zoe@example.de",
        code: "T-BBBB-2222",
        checkedInAt: "2026-10-18T18:14:00.000Z",
        entrance: "Haupteingang",
      }),
    ]
    const filtered = dashAttendeeListFilter({
      tickets,
      orders,
      ticketTypeName: () => "Stehplatz",
      q: "anna",
      ticketart: "",
      checkin: "alle",
      kanal: "alle",
    })
    const payload = dashAttendeeExportRowsCreate({
      filtered: filtered.rows,
      tickets,
      orders,
      scans: state.scans,
      event,
      ticketTypeName: () => "Stehplatz",
    })
    expect(payload.teilnehmerRows).toEqual([["Anna Muster", "Stehplatz", "T-AAAA-1111"]])
    expect(payload.orderRows.length).toBe(orders.length)
    const firstRow = payload.orderRows.find((row) => row[0] === firstOrder.number)
    expect(firstRow?.slice(1, 4)).toEqual([
      dashDateFormat(firstOrder.createdAt, "datum"),
      `${firstOrder.buyer.firstName} ${firstOrder.buyer.lastName}`.trim(),
      firstOrder.buyer.email,
    ])
    expect(payload.scanRows.length).toBe(state.scans.filter((scan) => scan.eventId === event.id).length)
  })
})
