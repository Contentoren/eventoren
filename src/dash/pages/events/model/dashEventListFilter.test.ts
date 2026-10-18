import { expect, test } from "bun:test"

import type { DashEvent } from "../../../model/dashEventSchema.ts"
import {
  dashEventCategoryLabel,
  dashEventListCategories,
  dashEventListCounts,
  dashEventListRows,
  dashEventListTabOf,
} from "./dashEventListFilter.ts"

function eventCreate(overrides: Partial<DashEvent> = {}): DashEvent {
  return {
    id: "ev-test",
    orgId: "org-lindenhof",
    slug: "test-event",
    title: "Sommernachtskonzert",
    subtitle: "",
    category: "konzert",
    startsAt: "2026-11-08T19:00:00.000Z",
    endsAt: "2026-11-08T23:00:00.000Z",
    doorsAt: "2026-11-08T18:00:00.000Z",
    venue: { name: "Lindenhof", street: "Lindenweg 1", zip: "10115", city: "Berlin" },
    imageUrl: "",
    imageAlt: "",
    description: "",
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

const now = new Date("2026-10-18T12:00:00.000Z")

test("Tabzuordnung: Entwürfe, Abgesagte, beendete und laufende Events", () => {
  expect(dashEventListTabOf(eventCreate({ status: "entwurf" }), now)).toBe("entwuerfe")
  expect(dashEventListTabOf(eventCreate({ status: "abgesagt" }), now)).toBe("vergangen")
  expect(
    dashEventListTabOf(
      eventCreate({
        status: "veroeffentlicht",
        startsAt: "2026-09-01T18:00:00.000Z",
        endsAt: "2026-09-01T22:00:00.000Z",
      }),
      now,
    ),
  ).toBe("vergangen")
  expect(dashEventListTabOf(eventCreate({ status: "veroeffentlicht" }), now)).toBe("aktuell")
})

test("Zähler je Tab zählen Vorlagen aus der Template-Liste", () => {
  const counts = dashEventListCounts(
    [
      eventCreate({ id: "a", status: "veroeffentlicht" }),
      eventCreate({ id: "b", status: "entwurf" }),
      eventCreate({ id: "c", status: "abgesagt" }),
    ],
    2,
    now,
  )
  expect(counts).toEqual({ aktuell: 1, entwuerfe: 1, vergangen: 1, vorlagen: 2 })
})

test("Kategorie-Chips enthalten nur Kategorien des aktiven Tabs mit Zähler", () => {
  const categories = dashEventListCategories(
    [
      eventCreate({ id: "a", category: "konzert", status: "veroeffentlicht" }),
      eventCreate({ id: "b", category: "party", status: "veroeffentlicht" }),
      eventCreate({ id: "c", category: "konzert", status: "entwurf" }),
    ],
    "aktuell",
    now,
  )
  expect(categories).toEqual([
    { value: "konzert", label: "Konzert", count: 1 },
    { value: "party", label: "Party", count: 1 },
  ])
})

test("Suche findet Titel, Ort und Stadt unabhängig von Großschreibung", () => {
  const rows = dashEventListRows({
    events: [
      eventCreate({ id: "a", title: "Sommernachtskonzert" }),
      eventCreate({
        id: "b",
        title: "Indie Night",
        venue: { name: "Lichtspiel", street: "", zip: "", city: "Potsdam" },
      }),
    ],
    statsById: {},
    tab: "aktuell",
    query: "lichtSPIEL",
    category: null,
    now,
  })
  expect(rows.map((row) => row.event.id)).toEqual(["b"])
})

test("Kategoriefilter und fehlende Stats fallen auf Null zurück", () => {
  const rows = dashEventListRows({
    events: [eventCreate({ id: "a", category: "konzert" }), eventCreate({ id: "b", category: "party" })],
    statsById: { a: { sold: 10, capacity: 20, revenueCents: 5000 } },
    tab: "aktuell",
    query: "",
    category: "konzert",
    now,
  })
  expect(rows).toHaveLength(1)
  expect(rows[0]?.stats).toEqual({ sold: 10, capacity: 20, revenueCents: 5000 })
  const fallback = dashEventListRows({
    events: [eventCreate({ id: "b", category: "party", title: "Ohne Stats" })],
    statsById: {},
    tab: "aktuell",
    query: "",
    category: null,
    now,
  })
  expect(fallback[0]?.stats).toEqual({ sold: 0, capacity: 0, revenueCents: 0 })
})

test("Aktuelle Events sortieren aufsteigend nach Beginn, vergangene absteigend", () => {
  const asc = dashEventListRows({
    events: [
      eventCreate({ id: "late", startsAt: "2026-12-01T19:00:00.000Z", endsAt: "2026-12-01T23:00:00.000Z" }),
      eventCreate({ id: "early", startsAt: "2026-11-01T19:00:00.000Z", endsAt: "2026-11-01T23:00:00.000Z" }),
    ],
    statsById: {},
    tab: "aktuell",
    query: "",
    category: null,
    now,
  })
  expect(asc.map((row) => row.event.id)).toEqual(["early", "late"])
  const desc = dashEventListRows({
    events: [
      eventCreate({
        id: "old",
        startsAt: "2026-08-01T19:00:00.000Z",
        endsAt: "2026-08-01T23:00:00.000Z",
      }),
      eventCreate({
        id: "recent",
        startsAt: "2026-09-01T19:00:00.000Z",
        endsAt: "2026-09-01T23:00:00.000Z",
      }),
    ],
    statsById: {},
    tab: "vergangen",
    query: "",
    category: null,
    now,
  })
  expect(desc.map((row) => row.event.id)).toEqual(["recent", "old"])
})

test("Kategorielabels sind deutsch und abgekürzt korrekt", () => {
  expect(dashEventCategoryLabel("abiball")).toBe("Abiball")
  expect(dashEventCategoryLabel("sonstiges")).toBe("Sonstiges")
})
