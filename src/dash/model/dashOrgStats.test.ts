import { describe, expect, test } from "bun:test"

import { dashOrgStats } from "./dashOrgStats.ts"
import {
  dashStatsEventCreate,
  dashStatsOrderOptions,
  dashStatsStateCreate,
  dashStatsTicketTypeCreate,
} from "./dashStatsFixtures.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashTicket } from "./dashTicketSchema.ts"

const now = new Date("2026-10-18T10:00:00.000Z")

function bucket(args: {
  id: string
  createdAt: string
  quantity?: number
  unitPriceCents?: number
  status?: DashOrder["status"]
  channel?: DashOrder["channel"]
  eventId?: string
}): { order: DashOrder; tickets: DashTicket[] } {
  return dashStatsOrderOptions({ channel: "online", ...args, eventId: args.eventId ?? "ev-1" })
}

describe("dashOrgStats", () => {
  test("7 Tage: 7 Buckets mit Tageslabels, Gästeliste und stornierte Bestellungen zählen nicht", () => {
    const first = bucket({ id: "o-today", createdAt: "2026-10-18T08:00:00.000Z", quantity: 2 })
    const yesterday = bucket({ id: "o-gestern", createdAt: "2026-10-17T20:00:00.000Z" })
    const guest = bucket({
      id: "o-gaesteliste",
      createdAt: "2026-10-18T08:00:00.000Z",
      channel: "gaesteliste",
      quantity: 5,
    })
    const cancelled = bucket({ id: "o-storno", createdAt: "2026-10-18T08:00:00.000Z", status: "storniert" })
    const orders = [first.order, yesterday.order, guest.order, cancelled.order]
    const tickets = [...first.tickets, ...yesterday.tickets, ...guest.tickets, ...cancelled.tickets]
    const result = dashOrgStats({
      state: dashStatsStateCreate({ orders, tickets, now }),
      orgId: "org-lindenhof",
      range: 7,
      now,
    })
    expect(result.series).toHaveLength(7)
    expect(result.series[6]?.label).toBe("18.10.")
    expect(result.series[6]?.revenueCents).toBe(4000)
    expect(result.series[6]?.tickets).toBe(2)
    expect(result.series[5]?.revenueCents).toBe(2000)
    expect(result.revenueCents).toBe(6000)
    expect(result.tickets).toBe(3)
    expect(result.orders).toBe(2)
    expect(result.avgOrderCents).toBe(3000)
    expect(result.previousRevenue).toHaveLength(7)
  })

  test("30 Tage: 30 Buckets, Umsatz = Ticketwert minus Ticket-Erstattungen", () => {
    const full = bucket({ id: "o-voll", createdAt: "2026-10-10T10:00:00.000Z", quantity: 2 })
    const partial = dashStatsOrderOptions({
      id: "o-teil",
      eventId: "ev-1",
      createdAt: "2026-10-10T12:00:00.000Z",
      quantity: 2,
      refundCents: 2000,
    })
    const orders = [full.order, partial.order]
    const tickets = [...full.tickets, ...partial.tickets]
    const result = dashOrgStats({
      state: dashStatsStateCreate({ orders, tickets, now }),
      orgId: "org-lindenhof",
      range: 30,
      now,
    })
    expect(result.series).toHaveLength(30)
    // 4000 + (4000 − 2000) = 6000
    expect(result.revenueCents).toBe(6000)
    expect(result.tickets).toBe(4)
  })

  test("365 Tage: 12 Monatsbuckets mit Kurzlabels, Delta null bei leerem Vorzeitraum", () => {
    const current = bucket({ id: "o-okt", createdAt: "2026-10-05T10:00:00.000Z", quantity: 2 })
    const orders = [current.order]
    const tickets = [...current.tickets]
    const result = dashOrgStats({
      state: dashStatsStateCreate({ orders, tickets, now }),
      orgId: "org-lindenhof",
      range: 365,
      now,
    })
    expect(result.series).toHaveLength(12)
    expect(result.series[11]?.label).toBe("Okt")
    expect(result.series[11]?.revenueCents).toBe(4000)
    expect(result.deltas.revenue).toBeNull()
    expect(result.deltas.tickets).toBeNull()
    expect(result.deltas.orders).toBeNull()
    expect(result.deltas.avgOrder).toBeNull()
    expect(result.previousRevenue).toHaveLength(12)
  })

  test("Delta vergleicht mit dem Vorzeitraum", () => {
    const currentA = bucket({ id: "o-neu-a", createdAt: "2026-10-18T08:00:00.000Z", quantity: 1 })
    const currentB = bucket({ id: "o-neu-b", createdAt: "2026-10-17T08:00:00.000Z", quantity: 1 })
    const previous = bucket({ id: "o-alt", createdAt: "2026-10-11T08:00:00.000Z", quantity: 1 })
    const orders = [currentA.order, currentB.order, previous.order]
    const tickets = [...currentA.tickets, ...currentB.tickets, ...previous.tickets]
    const result = dashOrgStats({
      state: dashStatsStateCreate({ orders, tickets, now }),
      orgId: "org-lindenhof",
      range: 7,
      now,
    })
    // aktuell 4000, vorher 2000 → +100 %
    expect(result.deltas.revenue).toBeCloseTo(1, 10)
    expect(result.deltas.orders).toBeCloseTo(1, 10)
  })

  test("Auslastung zählt verkaufte gegen Kapazität kommender Online-Ticketarten", () => {
    const state = dashStatsStateCreate({ orders: [], tickets: [], now })
    const upcoming = dashStatsEventCreate({
      id: "ev-kommend",
      startsAt: "2026-12-08T19:00:00.000Z",
      endsAt: "2026-12-08T23:00:00.000Z",
    })
    const past = dashStatsEventCreate({
      id: "ev-vergangen",
      slug: "event-ev-vergangen",
      title: "Event ev-vergangen",
      startsAt: "2026-09-08T19:00:00.000Z",
      endsAt: "2026-09-08T23:00:00.000Z",
    })
    const onlineType = dashStatsTicketTypeCreate({ id: "tt-online", eventId: "ev-kommend", capacity: 100 })
    const boxOfficeType = dashStatsTicketTypeCreate({
      id: "tt-kasse",
      eventId: "ev-kommend",
      capacity: 50,
      channel: "abendkasse",
    })
    const archivedType = dashStatsTicketTypeCreate({
      id: "tt-archiv",
      eventId: "ev-kommend",
      capacity: 50,
      archivedAt: "2026-10-01T00:00:00.000Z",
    })
    const sold = dashStatsOrderOptions({
      id: "o-voll",
      eventId: "ev-kommend",
      createdAt: "2026-10-10T10:00:00.000Z",
      quantity: 25,
      ticketTypeId: "tt-online",
    })
    state.events = [upcoming, past]
    state.ticketTypes = [onlineType, boxOfficeType, archivedType]
    state.orders = [sold.order]
    state.tickets = sold.tickets
    const result = dashOrgStats({ state, orgId: "org-lindenhof", range: 7, now })
    // nur Online-Kapazität 100, davon 25 verkauft → 2500 bps
    expect(result.occupancyBps).toBe(2500)
  })
})
