import { describe, expect, test } from "bun:test"
import { organizerDashboardOverviewStatsCreate } from "./organizerDashboardOverviewStatsCreate.ts"

describe("organizerDashboardOverviewStatsCreate", () => {
  test("buckets Berlin days, totals and occupancy", () => {
    const stats = organizerDashboardOverviewStatsCreate({
      days: ["2026-10-19", "2026-10-20", "2026-10-21"],
      sales: [
        { day: "2026-10-19", grossCents: 10000, tickets: 4, orders: 2 },
        { day: "2026-10-20", grossCents: 5000, tickets: 2, orders: 1 },
        { day: "2026-10-19", grossCents: 2500, tickets: 1, orders: 1 },
      ],
      previous: [{ day: "2026-10-16", grossCents: 8750, tickets: 3, orders: 2 }],
      capacity: 200,
      soldTickets: 100,
    })
    expect(stats.revenueCents).toBe(17500)
    expect(stats.tickets).toBe(7)
    expect(stats.orders).toBe(4)
    expect(stats.avgOrderCents).toBe(4375)
    expect(stats.occupancyBps).toBe(5000)
    expect(stats.series).toEqual([
      { day: "2026-10-19", revenueCents: 12500, tickets: 5, orders: 3 },
      { day: "2026-10-20", revenueCents: 5000, tickets: 2, orders: 1 },
      { day: "2026-10-21", revenueCents: 0, tickets: 0, orders: 0 },
    ])
    expect(stats.deltas.revenue).toBeCloseTo(1, 10)
    expect(stats.deltas.tickets).toBeCloseTo(4 / 3, 10)
    expect(stats.deltas.orders).toBeCloseTo(1, 10)
  })

  test("null deltas on empty previous window and zero capacity", () => {
    const stats = organizerDashboardOverviewStatsCreate({
      days: ["2026-10-21"],
      sales: [{ day: "2026-10-21", grossCents: 2000, tickets: 1, orders: 1 }],
      previous: [],
      capacity: 0,
      soldTickets: 0,
    })
    expect(stats.deltas).toEqual({ revenue: null, tickets: null, orders: null, avgOrder: null })
    expect(stats.occupancyBps).toBe(0)
  })

  test("ignores sales outside the window", () => {
    const stats = organizerDashboardOverviewStatsCreate({
      days: ["2026-10-21"],
      sales: [{ day: "2026-10-18", grossCents: 9000, tickets: 9, orders: 9 }],
      previous: [],
      capacity: 10,
      soldTickets: 1,
    })
    expect(stats.revenueCents).toBe(0)
    expect(stats.tickets).toBe(0)
    expect(stats.orders).toBe(0)
    expect(stats.occupancyBps).toBe(1000)
  })
})
