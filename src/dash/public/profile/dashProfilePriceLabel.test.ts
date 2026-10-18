import { describe, expect, test } from "bun:test"
import { dashProfilePriceLabel } from "./dashProfilePriceLabel.ts"
import {
  dashStatsEventCreate,
  dashStatsOrderOptions,
  dashStatsStateCreate,
  dashStatsTicketTypeCreate,
} from "../../model/dashStatsFixtures.ts"
import type { DashState } from "../../model/dashStateSchema.ts"

const now = new Date("2026-11-08T20:00:00.000Z")

function stateCreate(): DashState {
  const event = dashStatsEventCreate({ id: "ev-1" })
  const standard = dashStatsTicketTypeCreate({
    id: "tt-1",
    eventId: "ev-1",
    phases: [
      { id: "ph-early", name: "Early Bird", priceCents: 1500, endsAt: "2026-11-03T22:59:00.000Z", quota: null },
      { id: "ph-regulaer", name: "Regulär", priceCents: 2400, endsAt: null, quota: null },
    ],
  })
  const ermaessigt = dashStatsTicketTypeCreate({
    id: "tt-2",
    eventId: "ev-1",
    phases: [{ id: "ph-ermaessigt", name: "Regulär", priceCents: 1800, endsAt: null, quota: null }],
  })
  return {
    ...dashStatsStateCreate({ orders: [], tickets: [], now }),
    events: [event],
    ticketTypes: [standard, ermaessigt],
  }
}

describe("dashProfilePriceLabel", () => {
  test("nimmt den niedrigsten aktiven Online-Preis sichtbarer Ticketarten", () => {
    const state = stateCreate()
    const event = state.events[0]
    if (!event) throw new Error("missing event")
    expect(dashProfilePriceLabel({ state, event, now })).toBe("ab 18,00 €")
  })

  test("ignoriert versteckte, archivierte und Abendkasse-Typen", () => {
    const state = stateCreate()
    state.ticketTypes = state.ticketTypes.map((type) =>
      type.id === "tt-2" ? { ...type, hidden: true } : { ...type, channel: "abendkasse" as const },
    )
    const event = state.events[0]
    if (!event) throw new Error("missing event")
    expect(dashProfilePriceLabel({ state, event, now })).toBeNull()
  })

  test("meldet abgesagte und ausverkaufte Events", () => {
    const state = stateCreate()
    const event = state.events[0]
    if (!event) throw new Error("missing event")
    expect(dashProfilePriceLabel({ state, event: { ...event, status: "abgesagt" }, now })).toBe("Abgesagt")
    const sale = dashStatsOrderOptions({
      id: "o-full",
      eventId: "ev-1",
      createdAt: "2026-11-01T10:00:00.000Z",
      quantity: 200,
    })
    const full = {
      ...state,
      orders: [sale.order],
      tickets: sale.tickets,
      ticketTypes: state.ticketTypes.map((type) => ({ ...type, capacity: type.id === "tt-1" ? 200 : 0 })),
    }
    expect(dashProfilePriceLabel({ state: full, event, now })).toBe("Ausverkauft")
  })
})
