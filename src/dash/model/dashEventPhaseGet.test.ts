import { expect, test } from "bun:test"

import { dashEventPhaseGet } from "./dashEventPhaseGet.ts"
import type { DashEvent } from "./dashEventSchema.ts"

function eventCreate(overrides: Partial<DashEvent> = {}): DashEvent {
  return {
    id: "ev-jazz-wein",
    orgId: "org-lindenhof",
    slug: "jazz-und-wein",
    title: "Jazz & Wein",
    subtitle: "",
    category: "konzert",
    startsAt: "2026-11-08T19:00:00.000Z",
    endsAt: "2026-11-08T23:00:00.000Z",
    doorsAt: "2026-11-08T18:00:00.000Z",
    venue: { name: "Lindenhof", street: "Lindenweg 1", zip: "10115", city: "Berlin" },
    imageUrl: "",
    imageAlt: "Jazz im Hof",
    description: "Jazz und Wein im Innenhof.",
    faq: [],
    schedule: [],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
    boxOffice: { enabled: false, opensAt: null },
    reminder: { enabled: false, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    publishedAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  }
}

const beforeDoors = new Date("2026-11-08T15:00:00.000Z")

test("abgesagt hat Vorrang vor allem", () => {
  expect(
    dashEventPhaseGet({ event: eventCreate({ status: "abgesagt" }), sold: 0, capacity: 100, now: beforeDoors }),
  ).toBe("abgesagt")
})

test("Entwurf bleibt Entwurf auch während der Laufzeit", () => {
  const during = new Date("2026-11-08T20:00:00.000Z")
  expect(dashEventPhaseGet({ event: eventCreate({ status: "entwurf" }), sold: 0, capacity: 100, now: during })).toBe(
    "entwurf",
  )
})

test("nach Eventende ist beendet", () => {
  const after = new Date("2026-11-09T10:00:00.000Z")
  expect(dashEventPhaseGet({ event: eventCreate(), sold: 10, capacity: 100, now: after })).toBe("beendet")
})

test("ab Einlass ist live", () => {
  const atDoors = new Date("2026-11-08T18:30:00.000Z")
  expect(dashEventPhaseGet({ event: eventCreate(), sold: 10, capacity: 100, now: atDoors })).toBe("live")
})

test("ohne Einlasszeit zählt der Beginn", () => {
  const event = eventCreate({ doorsAt: null })
  expect(dashEventPhaseGet({ event, sold: 10, capacity: 100, now: new Date("2026-11-08T19:30:00.000Z") })).toBe("live")
})

test("volle Kapazität ist ausverkauft", () => {
  expect(dashEventPhaseGet({ event: eventCreate(), sold: 100, capacity: 100, now: beforeDoors })).toBe("ausverkauft")
})

test("Kapazität null verhindert ausverkauft", () => {
  expect(dashEventPhaseGet({ event: eventCreate(), sold: 5, capacity: 0, now: beforeDoors })).toBe("im-verkauf")
})

test("pausierter Verkauf meldet pausiert", () => {
  expect(
    dashEventPhaseGet({ event: eventCreate({ salesPaused: true }), sold: 10, capacity: 100, now: beforeDoors }),
  ).toBe("pausiert")
})

test("Standardzustand ist im Verkauf", () => {
  expect(dashEventPhaseGet({ event: eventCreate(), sold: 10, capacity: 100, now: beforeDoors })).toBe("im-verkauf")
})
