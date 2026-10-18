import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../store/seed/dashSeedCreate.ts"
import { dashEventPublishCheck } from "./dashEventPublishCheck.ts"

const now = new Date("2026-10-18T10:00:00.000Z")

function dashPublishCheckSeed() {
  const state = dashSeedCreate(now)
  const org = state.orgs.find((candidate) => candidate.id === "org-lindenhof") ?? null
  return { state, org }
}

describe("dashEventPublishCheck", () => {
  test("Jazz & Wein ist bereit", () => {
    const { state, org } = dashPublishCheckSeed()
    const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
    if (!event) throw new Error("Seed-Event fehlt")
    const types = state.ticketTypes.filter((candidate) => candidate.eventId === event.id)
    const result = dashEventPublishCheck(event, types, org)
    expect(result.ok).toBe(true)
    expect(result.items.map((item) => item.id)).toEqual(["basis", "bild", "alt", "tickets", "beschreibung", "org"])
    expect(result.items.map((item) => item.label)).toEqual([
      "Basisdaten",
      "Titelbild",
      "Alt-Text",
      "Ticketarten",
      "Beschreibung",
      "Organisation freigegeben",
    ])
    expect(result.items.every((item) => item.done)).toBe(true)
  })

  test("Lesung meldet Alt-Text und Beschreibung", () => {
    const { state, org } = dashPublishCheckSeed()
    const event = state.events.find((candidate) => candidate.id === "ev-lesung")
    if (!event) throw new Error("Seed-Event fehlt")
    const types = state.ticketTypes.filter((candidate) => candidate.eventId === event.id)
    const result = dashEventPublishCheck(event, types, org)
    expect(result.ok).toBe(false)
    const byId = new Map(result.items.map((item) => [item.id, item]))
    expect(byId.get("basis")?.done).toBe(true)
    expect(byId.get("bild")?.done).toBe(true)
    expect(byId.get("alt")?.done).toBe(false)
    expect(byId.get("alt")?.required).toBe(true)
    expect(byId.get("tickets")?.done).toBe(true)
    expect(byId.get("tickets")?.required).toBe(true)
    expect(byId.get("beschreibung")?.done).toBe(false)
    expect(byId.get("beschreibung")?.required).toBe(false)
    expect(byId.get("org")?.done).toBe(true)
  })

  test("Basisdaten prüfen Titel, Zeiten und Ort", () => {
    const { state, org } = dashPublishCheckSeed()
    const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
    if (!event) throw new Error("Seed-Event fehlt")
    const types = state.ticketTypes.filter((candidate) => candidate.id === event.id)
    const broken = { ...event, title: "  ", venue: { ...event.venue, city: "" } }
    expect(dashEventPublishCheck(broken, types, org).ok).toBe(false)
    const swapped = { ...event, startsAt: event.endsAt, endsAt: event.startsAt }
    const swappedResult = dashEventPublishCheck(swapped, types, org)
    expect(swappedResult.items.find((item) => item.id === "basis")?.done).toBe(false)
  })

  test("Ticketarten brauchen eine nicht archivierte Online-Art", () => {
    const { state, org } = dashPublishCheckSeed()
    const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
    if (!event) throw new Error("Seed-Event fehlt")
    const archived = state.ticketTypes
      .filter((candidate) => candidate.eventId === event.id)
      .map((candidate) => ({ ...candidate, channel: "abendkasse" as const, archivedAt: now.toISOString() }))
    const result = dashEventPublishCheck(event, archived, org)
    expect(result.items.find((item) => item.id === "tickets")?.done).toBe(false)
    expect(result.ok).toBe(false)
  })

  test("Organisation muss aktiv sein", () => {
    const { state, org } = dashPublishCheckSeed()
    const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
    if (!event) throw new Error("Seed-Event fehlt")
    const types = state.ticketTypes.filter((candidate) => candidate.id === event.id)
    expect(dashEventPublishCheck(event, types, null).ok).toBe(false)
    if (!org) throw new Error("Seed-Org fehlt")
    expect(dashEventPublishCheck(event, types, { ...org, status: "pruefung" }).ok).toBe(false)
    expect(dashEventPublishCheck(event, types, { ...org, status: "gesperrt" }).ok).toBe(false)
  })
})
