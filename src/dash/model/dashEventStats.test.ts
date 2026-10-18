import { describe, expect, test } from "bun:test"

import { dashEventStats } from "./dashEventStats.ts"
import { dashStatsOrderOptions, dashStatsStateCreate } from "./dashStatsFixtures.ts"
import type { DashScan } from "./dashScanSchema.ts"

const liveNow = new Date("2026-11-08T20:00:00.000Z")

function scanCreate(overrides: Partial<DashScan> & { id: string }): DashScan {
  return {
    eventId: "ev-1",
    at: "2026-11-08T19:30:00.000Z",
    entrance: "Haupteingang",
    device: "Scanner 1",
    ticketId: null,
    code: "T-0000-0000",
    result: "ok",
    ...overrides,
  }
}

describe("dashEventStats", () => {
  test("Verkaufskurve ist kumulativ mit mindestens 2 Punkten und Phasenmarkierung am Endetag", () => {
    const live = dashStatsStateCreate({ orders: [], tickets: [], now: liveNow })
    live.events = live.events.map((event) =>
      event.id === "ev-1"
        ? {
            ...event,
            startsAt: "2026-11-08T19:00:00.000Z",
            endsAt: "2026-11-08T23:00:00.000Z",
            doorsAt: "2026-11-08T18:00:00.000Z",
          }
        : event,
    )
    live.ticketTypes = live.ticketTypes.map((type) =>
      type.id === "tt-1"
        ? {
            ...type,
            phases: [
              { id: "ph-early", name: "Early Bird", priceCents: 1500, endsAt: "2026-11-03T22:59:00.000Z", quota: null },
              { id: "ph-regulaer", name: "Regulär", priceCents: 2000, endsAt: null, quota: null },
            ],
          }
        : type,
    )
    const early = dashStatsOrderOptions({
      id: "o-early",
      eventId: "ev-1",
      createdAt: "2026-11-01T10:00:00.000Z",
      quantity: 2,
      ticketTypeId: "tt-1",
    })
    const late = dashStatsOrderOptions({
      id: "o-late",
      eventId: "ev-1",
      createdAt: "2026-11-05T10:00:00.000Z",
      quantity: 3,
      ticketTypeId: "tt-1",
    })
    const cancelled = dashStatsOrderOptions({
      id: "o-storno",
      eventId: "ev-1",
      createdAt: "2026-11-05T11:00:00.000Z",
      quantity: 7,
      status: "storniert",
      ticketTypeId: "tt-1",
    })
    for (const ticket of cancelled.tickets) ticket.status = "storniert"
    const guest = dashStatsOrderOptions({
      id: "o-gast",
      eventId: "ev-1",
      createdAt: "2026-11-05T12:00:00.000Z",
      quantity: 2,
      channel: "gaesteliste",
      ticketTypeId: "tt-1",
    })
    live.orders = [early.order, late.order, cancelled.order, guest.order]
    live.tickets = [...early.tickets, ...late.tickets, ...cancelled.tickets, ...guest.tickets]
    const result = dashEventStats({ state: live, eventId: "ev-1", now: liveNow })
    // Gästeliste und stornierte Bestellungen zählen nicht für sold/Umsatz
    expect(result.sold).toBe(5)
    expect(result.revenueCents).toBe(10000)
    // Gästeliste-Tickets zählen für gültige Tickets und Check-ins
    expect(result.validTickets).toBe(7)
    expect(result.salesCurve.length).toBeGreaterThanOrEqual(2)
    const last = result.salesCurve[result.salesCurve.length - 1]
    expect(last?.cumulativeTickets).toBe(5)
    for (let index = 1; index < result.salesCurve.length; index += 1)
      expect(result.salesCurve[index]?.cumulativeTickets ?? 0).toBeGreaterThanOrEqual(
        result.salesCurve[index - 1]?.cumulativeTickets ?? 0,
      )
    expect(result.phaseMarkers).toHaveLength(1)
    expect(result.phaseMarkers[0]?.label).toBe("Early Bird endet")
    const markerDay = result.salesCurve[result.phaseMarkers[0]?.index ?? -1]?.key
    expect(markerDay).toBe("2026-11-03")
    expect(result.recentOrderIds.slice(0, 2)).toEqual(["o-gast", "o-storno"])
  })

  test("checkInsByQuarter hat 16 Einträge nach Einlassbeginn und zählt abgelehnte Scans", () => {
    const live = dashStatsStateCreate({ orders: [], tickets: [], now: liveNow })
    live.events = live.events.map((event) =>
      event.id === "ev-1"
        ? {
            ...event,
            startsAt: "2026-11-08T19:00:00.000Z",
            endsAt: "2026-11-08T23:00:00.000Z",
            doorsAt: "2026-11-08T18:00:00.000Z",
          }
        : event,
    )
    const sale = dashStatsOrderOptions({
      id: "o-1",
      eventId: "ev-1",
      createdAt: "2026-11-01T10:00:00.000Z",
      quantity: 4,
      checkedInAt: "2026-11-08T19:50:00.000Z",
    })
    live.orders = [sale.order]
    live.tickets = sale.tickets
    live.scans = [
      scanCreate({ id: "s-1" }),
      scanCreate({ id: "s-2", result: "doppelt" }),
      scanCreate({ id: "s-3", entrance: "Seiteneingang", result: "storniert" }),
    ]
    const result = dashEventStats({ state: live, eventId: "ev-1", now: liveNow })
    expect(result.checkInsByQuarter).toHaveLength(16)
    expect(result.checkInsByQuarter.reduce((sum, quarter) => sum + quarter.count, 0)).toBe(4)
    expect(result.checkInsByQuarter[15]?.label).toBe("21:00")
    expect(result.checkedIn).toBe(4)
    expect(result.rejectedScans).toBe(2)
    expect(result.entrances).toEqual([
      { entrance: "Haupteingang", ok: 1, rejected: 1 },
      { entrance: "Seiteneingang", ok: 0, rejected: 1 },
      { entrance: "Abendkasse", ok: 0, rejected: 0 },
    ])
  })

  test("ohne Einlass (mehr als 1 h vorher) ist checkInsByQuarter leer und offene Zahlungen gezählt", () => {
    const before = new Date("2026-11-08T10:00:00.000Z")
    const state = dashStatsStateCreate({ orders: [], tickets: [], now: before })
    state.events = state.events.map((event) =>
      event.id === "ev-1"
        ? {
            ...event,
            startsAt: "2026-11-08T19:00:00.000Z",
            endsAt: "2026-11-08T23:00:00.000Z",
            doorsAt: "2026-11-08T18:00:00.000Z",
          }
        : event,
    )
    const open = dashStatsOrderOptions({
      id: "o-offen",
      eventId: "ev-1",
      createdAt: "2026-11-01T10:00:00.000Z",
      status: "offen",
      quantity: 2,
    })
    state.orders = [open.order]
    state.tickets = open.tickets
    const result = dashEventStats({ state, eventId: "ev-1", now: before })
    expect(result.checkInsByQuarter).toEqual([])
    expect(result.openPayments).toEqual({ count: 1, amountCents: 4000 })
    expect(result.revenueCents).toBe(4000)
  })
})
