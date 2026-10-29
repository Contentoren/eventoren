import { expect, test } from "bun:test"
import type { AdminEventItem } from "./AdminEventItem.ts"
import { adminArchivedEventDetailsStateCreate } from "./adminArchivedEventDetailsStateCreate.ts"

function archivedEvent(): AdminEventItem {
  return {
    id: "retained-archive",
    catalogVersion: 1,
    status: "archived",
    title: "Archiv",
    subtitle: "Untertitel",
    organizer: "Veranstalter",
    category: "custom-category",
    description: "",
    startsAt: "2026-10-29T18:00:00Z",
    doorsAt: "2026-10-29T17:00:00Z",
    endsAt: "2026-10-29T21:00:00Z",
    venue: "Saal",
    city: "Berlin",
    address: "Straße 1",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    soldOut: false,
    tiers: [
      {
        id: "retained-product",
        name: "Standard",
        description: "Originalprodukt",
        priceCents: 1250,
        feeCents: 150,
        capacity: 40,
        available: 0,
        sold: 40,
        maxPerOrder: 2,
        activationCodeRequired: true,
      },
    ],
  }
}

test("archived details retain Berlin event times and product accounting configuration without inventing empty data", () => {
  const event = archivedEvent()
  const before = JSON.stringify(event)
  const state = adminArchivedEventDetailsStateCreate(() => event)
  const fields = Object.fromEntries(state.fields().map((field) => [field.label, field.value]))
  expect(fields.Beginn).toContain("19:00 Uhr (Europe/Berlin)")
  expect(fields.Einlass).toContain("18:00 Uhr (Europe/Berlin)")
  expect(fields.Ende).toContain("22:00 Uhr (Europe/Berlin)")
  expect(fields.Veranstalter).toBe("Veranstalter")
  expect(fields.Kategorie).toBe("custom-category")
  expect(fields.Beschreibung).toBeUndefined()
  expect(state.products()[0]?.name).toBe("Standard")
  const product = Object.fromEntries(state.products()[0]?.fields.map((field) => [field.label, field.value]) ?? [])
  expect(product.Preis).toContain("12,50")
  expect(product.Gebühr).toContain("1,50")
  expect(product.Kapazität).toBe(40)
  expect(product.Verfügbar).toBe(0)
  expect(product["Verkauft (Produktzähler)"]).toBe(40)
  expect(product["Maximum pro Bestellung"]).toBe(2)
  expect(product["Aktivierungscode erforderlich"]).toBe("Ja")
  expect(JSON.stringify(event)).toBe(before)
})

test("archived view tracks the retained input and leaves missing products and optional settings empty", () => {
  let event = archivedEvent()
  const state = adminArchivedEventDetailsStateCreate(() => event)
  event = { ...event, tiers: [], startsAt: "", doorsAt: "", endsAt: "" }
  expect(state.products()).toEqual([])
  expect(state.fields().some((field) => ["Beginn", "Einlass", "Ende"].includes(field.label))).toBe(false)
})
