import { expect, test } from "bun:test"

import type { DashState } from "#src/dash/model/dashStateSchema.ts"
import { dashSeedCreate } from "#src/dash/store/seed/dashSeedCreate.ts"
import { dashEventToEventItem, dashEventToFaqItems, dashEventToScheduleItems } from "./dashEventToEventItem.ts"

const now = new Date("2026-09-18T12:00:00.000Z")

function jazzState(): DashState {
  return dashSeedCreate(new Date("2026-09-18T12:00:00.000Z"))
}

test("adaptiert Jazz & Wein: nur Online-Typen, aktiver Phasenpreis, Käufergebühr", () => {
  const state = jazzState()
  const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
  if (!event) throw new Error("Jazz-Event fehlt im Seed")
  const item = dashEventToEventItem(state, event, now)
  expect(item.title).toBe("Jazz & Wein")
  expect(item.organizer).toBe("Kulturhaus Lindenhof e.V.")
  const names = item.tiers.map((tier) => tier.name)
  expect(names).toContain("Sitzplatz Kategorie A")
  expect(names).toContain("Sitzplatz Kategorie B")
  expect(names).not.toContain("Presse")
  expect(names.some((name) => name.includes("Abendkasse"))).toBe(false)
  const katA = item.tiers.find((tier) => tier.id === "tt-jazz-a")
  expect(katA?.priceCents).toBe(3400)
  expect(katA?.feeCents).toBeGreaterThan(0)
  expect(katA?.maxPerOrder).toBe(10)
  expect(item.tags).toContain("Konzert")
  expect(item.category).toBe("Konzert")
})

test("schaltet versteckte Typen nur mit Zugangscode frei", () => {
  const state = jazzState()
  const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
  if (!event) throw new Error("Jazz-Event fehlt im Seed")
  const unlocked = dashEventToEventItem(state, event, now, ["tt-jazz-presse"])
  expect(unlocked.tiers.map((tier) => tier.name)).toContain("Presse")
})

test("mappt FAQ und Ablauf auf die Formate der Eventseite", () => {
  const state = jazzState()
  const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
  if (!event) throw new Error("Jazz-Event fehlt im Seed")
  const faqs = dashEventToFaqItems(event.faq)
  expect(faqs).toHaveLength(3)
  expect(faqs[0]).toEqual({ id: "faq-jazz-1", question: expect.any(String), answer: expect.any(String) })
  const schedule = dashEventToScheduleItems(event.schedule)
  expect(schedule[0]?.marker).toBe("19:00 Uhr")
  expect(schedule[0]?.title).toBe("Einlass")
})
