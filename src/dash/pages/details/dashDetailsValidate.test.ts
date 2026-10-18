import { expect, test } from "bun:test"

import {
  dashDetailsErrorCount,
  dashDetailsFirstErrorSection,
  dashDetailsValidate,
  type DashDetailsDraft,
} from "./dashDetailsValidate.ts"

function draftCreate(overrides: Partial<DashDetailsDraft> = {}): DashDetailsDraft {
  return {
    title: "Sommernachtskonzert im Park",
    subtitle: "Open Air",
    category: "konzert",
    startsAt: "2026-11-08T19:00:00.000Z",
    endsAt: "2026-11-08T23:00:00.000Z",
    doorsAt: "2026-11-08T18:00:00.000Z",
    venueName: "Stadtpark",
    venueStreet: "Parkallee 1",
    venueZip: "10115",
    venueCity: "Berlin",
    imageUrl: "https://assets.eventoren.de/konzert.webp",
    imageAlt: "Beleuchtete Konzertbühne",
    description: "Ein Abend unter freiem Himmel.",
    schedule: [],
    faq: [],
    visibility: "oeffentlich",
    salesPaused: false,
    ...overrides,
  }
}

test("gültiger Entwurf meldet keine Fehler", () => {
  const errors = dashDetailsValidate(draftCreate())
  expect(dashDetailsErrorCount(errors)).toBe(0)
  expect(dashDetailsFirstErrorSection(errors)).toBeNull()
})

test("zu kurzer Titel meldet Fehler in der Basis-Sektion", () => {
  const errors = dashDetailsValidate(draftCreate({ title: "AB" }))
  expect(errors.title).not.toBeNull()
  expect(dashDetailsFirstErrorSection(errors)).toBe("basis")
})

test("Ende vor Beginn meldet Zeitfehler", () => {
  const errors = dashDetailsValidate(draftCreate({ endsAt: "2026-11-08T18:00:00.000Z" }))
  expect(errors.timing).not.toBeNull()
  expect(dashDetailsFirstErrorSection(errors)).toBe("basis")
})

test("Einlass nach Beginn meldet Fehler", () => {
  const errors = dashDetailsValidate(draftCreate({ doorsAt: "2026-11-08T20:00:00.000Z" }))
  expect(errors.doors).not.toBeNull()
})

test("fehlender Ortsname und fehlende Stadt melden Fehler", () => {
  const errors = dashDetailsValidate(draftCreate({ venueName: "  ", venueCity: "" }))
  expect(errors.venueName).not.toBeNull()
  expect(errors.venueCity).not.toBeNull()
  expect(dashDetailsFirstErrorSection(errors)).toBe("ort")
})

test("Bild ohne Alt-Text meldet Pflichtfehler", () => {
  const errors = dashDetailsValidate(draftCreate({ imageAlt: "" }))
  expect(errors.imageAlt).toBe("Alt-Text ist Pflicht für Barrierefreiheit.")
  expect(dashDetailsFirstErrorSection(errors)).toBe("bild")
})

test("Bild ohne URL braucht keinen Alt-Text", () => {
  const errors = dashDetailsValidate(draftCreate({ imageUrl: "", imageAlt: "" }))
  expect(errors.imageAlt).toBeNull()
})

test("zu lange Beschreibung meldet Fehler", () => {
  const errors = dashDetailsValidate(draftCreate({ description: "x".repeat(3001) }))
  expect(errors.description).not.toBeNull()
  expect(dashDetailsFirstErrorSection(errors)).toBe("beschreibung")
})
