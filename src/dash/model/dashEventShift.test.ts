import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../store/seed/dashSeedCreate.ts"
import { dashEventShift } from "./dashEventShift.ts"

const now = new Date("2026-10-18T10:00:00.000Z")
const weekMs = 7 * 24 * 3_600_000

describe("dashEventShift", () => {
  test("verschiebt Event-, Verkaufs- und Phasenzeiten um dieselbe Differenz", () => {
    const state = dashSeedCreate(now)
    const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
    if (!event) throw new Error("Seed-Event fehlt")
    const types = state.ticketTypes.filter((candidate) => candidate.eventId === event.id)
    const newStartsAt = new Date(Date.parse(event.startsAt) + weekMs).toISOString()
    const result = dashEventShift(event, types, newStartsAt)
    expect(result.event.startsAt).toBe(newStartsAt)
    expect(Date.parse(result.event.endsAt) - Date.parse(event.endsAt)).toBe(weekMs)
    expect(Date.parse(result.event.doorsAt ?? "") - Date.parse(event.doorsAt ?? "")).toBe(weekMs)
    const type = result.ticketTypes.find((candidate) => candidate.id === "tt-jazz-a")
    const source = types.find((candidate) => candidate.id === "tt-jazz-a")
    expect(type).toBeDefined()
    expect(Date.parse(type?.salesStartAt ?? "") - Date.parse(source?.salesStartAt ?? "")).toBe(weekMs)
    expect(type?.phases.map((phase) => phase.endsAt)).toEqual(
      source?.phases.map((phase) =>
        phase.endsAt === null ? null : new Date(Date.parse(phase.endsAt) + weekMs).toISOString(),
      ),
    )
    expect(result.ticketTypes.find((candidate) => candidate.id === "tt-jazz-b")?.phases.at(-1)?.endsAt).toBeNull()
  })

  test("Null-Werte bleiben Null und die Eingaben unverändert", () => {
    const state = dashSeedCreate(now)
    const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
    if (!event) throw new Error("Seed-Event fehlt")
    const presse = state.ticketTypes.filter((candidate) => candidate.id === "tt-jazz-presse")
    const newStartsAt = new Date(Date.parse(event.startsAt) + weekMs).toISOString()
    const result = dashEventShift(event, presse, newStartsAt)
    expect(result.ticketTypes[0]?.salesStartAt).toBeNull()
    expect(result.ticketTypes[0]?.salesEndAt).toBeNull()
    expect(presse[0]?.salesStartAt).toBeNull()
    expect(event.startsAt).not.toBe(newStartsAt)
  })
})
