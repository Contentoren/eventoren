import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashCheckinStats } from "./dashCheckinStats.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

describe("dashCheckinStats", () => {
  test("liefert Live-Kennzahlen für die Indie Night", () => {
    const state = dashSeedCreate(fixedNow)
    const stats = dashCheckinStats(state, "ev-indie-night", fixedNow)
    expect(stats.checkedIn).toBeGreaterThan(250)
    expect(stats.rejected).toBe(9)
    expect(stats.quarters).toHaveLength(16)
    expect(stats.valid).toBeGreaterThanOrEqual(stats.checkedIn)
    expect(stats.percent).toBe(Math.round((stats.checkedIn / stats.valid) * 100))
    expect(stats.recent.length).toBeLessThanOrEqual(50)
    for (let index = 1; index < stats.recent.length; index += 1) {
      const previous = stats.recent[index - 1]
      const current = stats.recent[index]
      expect(previous !== undefined && current !== undefined && previous.at >= current.at).toBe(true)
    }
    expect(stats.quarters[15]?.current).toBe(true)
    expect(stats.quarters[15]?.count).toBeGreaterThanOrEqual(0)
    for (const quarter of stats.quarters) expect(quarter.label).toMatch(/^\d{2}:\d{2}$/)
  })

  test("gruppiert nach Ticketart und Einlass", () => {
    const state = dashSeedCreate(fixedNow)
    const stats = dashCheckinStats(state, "ev-indie-night", fixedNow)
    expect(stats.byTicketType.length).toBeGreaterThan(0)
    for (const entry of stats.byTicketType) {
      expect(entry.valid).toBeGreaterThanOrEqual(entry.checkedIn)
      expect(entry.name.length).toBeGreaterThan(0)
    }
    expect(stats.byEntrance.map((entry) => entry.entrance)).toEqual(["Haupteingang", "Seiteneingang", "Abendkasse"])
    const totalOk = stats.byEntrance.reduce((sum, entry) => sum + entry.ok, 0)
    const totalRejected = stats.byEntrance.reduce((sum, entry) => sum + entry.rejected, 0)
    expect(totalRejected).toBe(stats.rejected)
    expect(totalOk).toBeGreaterThanOrEqual(stats.checkedIn)
  })
})
