import { describe, expect, test } from "bun:test"
import { organizerDashboardAdmissionStatsCreate } from "./organizerDashboardAdmissionStatsCreate.ts"

describe("organizerDashboardAdmissionStatsCreate", () => {
  test("aggregates per tier, entrance and rejected reasons", () => {
    const stats = organizerDashboardAdmissionStatsCreate({
      eventKey: "sommerfest",
      tiers: [
        { tierKey: "standard", tierName: "Standard", capacity: 100 },
        { tierKey: "vip", tierName: "VIP", capacity: 10 },
      ],
      tickets: [
        { tierKey: "standard", checkedInAt: "2026-10-21T18:00:00.000Z" },
        { tierKey: "standard" },
        { tierKey: "standard", cancelled: true },
        { tierKey: "vip" },
      ],
      scans: [
        { entrance: "Haupteingang", result: "ok" },
        { entrance: "Haupteingang", result: "doppelt" },
        { entrance: "Seite", result: "unbekannt" },
      ],
    })
    expect(stats.totals).toEqual({ sold: 3, checkedIn: 1, rejected: 2 })
    expect(stats.byTier).toEqual([
      { tierKey: "standard", tierName: "Standard", capacity: 100, sold: 2, checkedIn: 1, cancelled: 1 },
      { tierKey: "vip", tierName: "VIP", capacity: 10, sold: 1, checkedIn: 0, cancelled: 0 },
    ])
    expect(stats.byEntrance).toEqual([
      { entrance: "Haupteingang", checkedIn: 1, rejected: 1 },
      { entrance: "Seite", checkedIn: 0, rejected: 1 },
    ])
    expect(stats.rejected).toEqual([
      { result: "doppelt", count: 1 },
      { result: "unbekannt", count: 1 },
    ])
  })

  test("empty input yields empty rows and zero totals", () => {
    const stats = organizerDashboardAdmissionStatsCreate({ eventKey: "x", tiers: [], tickets: [], scans: [] })
    expect(stats.totals).toEqual({ sold: 0, checkedIn: 0, rejected: 0 })
    expect(stats.byTier).toEqual([])
    expect(stats.byEntrance).toEqual([])
    expect(stats.rejected).toEqual([])
  })
})
