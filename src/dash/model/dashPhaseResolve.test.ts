import { expect, test } from "bun:test"

import { dashPhaseResolve } from "./dashPhaseResolve.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"

function ticketTypeCreate(overrides: Partial<DashTicketType> = {}): DashTicketType {
  return {
    id: "tt-stehplatz",
    eventId: "ev-jazz-wein",
    name: "Stehplatz",
    description: "",
    channel: "online",
    hidden: false,
    capacity: 100,
    maxPerOrder: 10,
    taxRateBps: 700,
    sortOrder: 0,
    archivedAt: null,
    salesStartAt: null,
    salesEndAt: null,
    phases: [
      { id: "ph-early", name: "Early Bird", priceCents: 1800, endsAt: "2026-10-10T18:00:00.000Z", quota: 30 },
      { id: "ph-regulaer", name: "Regulär", priceCents: 2200, endsAt: null, quota: null },
    ],
    ...overrides,
  }
}

const beforeEarly = new Date("2026-10-01T10:00:00.000Z")
const duringEarly = new Date("2026-10-05T10:00:00.000Z")

test("aktive erste Phase mit Datum als Endgrund", () => {
  const result = dashPhaseResolve(ticketTypeCreate(), {}, duringEarly)
  expect(result.phase?.id).toBe("ph-early")
  expect(result.index).toBe(0)
  expect(result.state).toBe("aktiv")
  expect(result.nextPhase?.id).toBe("ph-regulaer")
  expect(result.endsReason).toBe("datum")
  expect(result.endsAt).toBe("2026-10-10T18:00:00.000Z")
  expect(result.remainingInPhase).toBe(30)
})

test("vor Verkaufsstart ist Zustand geplant mit erster Phase als nächster", () => {
  const ticketType = ticketTypeCreate({ salesStartAt: "2026-10-20T10:00:00.000Z" })
  const result = dashPhaseResolve(ticketType, {}, duringEarly)
  expect(result.state).toBe("geplant")
  expect(result.phase).toBeNull()
  expect(result.index).toBe(-1)
  expect(result.nextPhase?.id).toBe("ph-early")
  expect(result.endsReason).toBeNull()
  expect(result.endsAt).toBeNull()
  expect(result.remainingInPhase).toBeNull()
})

test("nach Verkaufsende ist Zustand beendet", () => {
  const ticketType = ticketTypeCreate({ salesEndAt: "2026-10-02T10:00:00.000Z" })
  const result = dashPhaseResolve(ticketType, {}, duringEarly)
  expect(result.state).toBe("beendet")
  expect(result.phase).toBeNull()
  expect(result.nextPhase).toBeNull()
})

test("nach abgelaufener Phase wird nächste Phase aktiv", () => {
  const afterEarly = new Date("2026-10-11T10:00:00.000Z")
  const result = dashPhaseResolve(ticketTypeCreate(), { "ph-early": 10 }, afterEarly)
  expect(result.phase?.id).toBe("ph-regulaer")
  expect(result.index).toBe(1)
  expect(result.state).toBe("aktiv")
  expect(result.nextPhase).toBeNull()
  expect(result.endsReason).toBeNull()
  expect(result.endsAt).toBeNull()
  expect(result.remainingInPhase).toBeNull()
})

test("bei vollem Kontingent wird nächste Phase aktiv mit Kontingent-Endgrund", () => {
  const ticketType = ticketTypeCreate({
    phases: [
      { id: "ph-early", name: "Early Bird", priceCents: 1800, endsAt: null, quota: 30 },
      { id: "ph-regulaer", name: "Regulär", priceCents: 2200, endsAt: null, quota: 50 },
    ],
  })
  const result = dashPhaseResolve(ticketType, { "ph-early": 30 }, duringEarly)
  expect(result.phase?.id).toBe("ph-regulaer")
  expect(result.endsReason).toBe("kontingent")
  expect(result.remainingInPhase).toBe(50)
})

test("bevorzugt Datum, wenn Phase Datum und Kontingent hat", () => {
  const ticketType = ticketTypeCreate({
    phases: [{ id: "ph-early", name: "Early Bird", priceCents: 1800, endsAt: "2026-10-10T18:00:00.000Z", quota: 30 }],
  })
  const result = dashPhaseResolve(ticketType, { "ph-early": 5 }, duringEarly)
  expect(result.endsReason).toBe("datum")
  expect(result.remainingInPhase).toBe(25)
})

test("alle Phasen zu Ende ergibt beendet", () => {
  const ticketType = ticketTypeCreate({
    phases: [{ id: "ph-early", name: "Early Bird", priceCents: 1800, endsAt: "2026-10-02T18:00:00.000Z", quota: null }],
  })
  const result = dashPhaseResolve(ticketType, { "ph-early": 5 }, duringEarly)
  expect(result.state).toBe("beendet")
  expect(result.phase).toBeNull()
  expect(result.index).toBe(-1)
})

test("bei erreichter Kapazität bleibt aktive Phase mit Zustand ausverkauft", () => {
  const ticketType = ticketTypeCreate({ capacity: 2 })
  const result = dashPhaseResolve(ticketType, { "ph-early": 2 }, duringEarly)
  expect(result.state).toBe("ausverkauft")
  expect(result.phase?.id).toBe("ph-early")
  expect(result.index).toBe(0)
})
