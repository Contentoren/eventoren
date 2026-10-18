import { describe, expect, test } from "bun:test"
import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashOverviewActivityCreate } from "./dashOverviewActivityCreate.ts"

describe("dashOverviewActivityCreate", () => {
  test("liefert maximal 8 Einträge, neueste zuerst", () => {
    const state = dashSeedCreate(new Date("2026-10-18T18:00:00+02:00"))
    const orgId = state.orgs[0]?.id ?? ""
    const items = dashOverviewActivityCreate({ state, orgId, now: new Date("2026-10-18T18:00:00+02:00") })
    expect(items.length).toBeLessThanOrEqual(8)
    const times = items.map((item) => new Date(item.at).getTime())
    const sorted = [...times].sort((a, b) => b - a)
    expect(times).toEqual(sorted)
  })

  test("enthält Bestellungen, Erstattungen und Audit-Aktionen", () => {
    const state = dashSeedCreate(new Date("2026-10-18T18:00:00+02:00"))
    const orgId = state.orgs[0]?.id ?? ""
    const items = dashOverviewActivityCreate({ state, orgId, now: new Date("2026-10-18T18:00:00+02:00") })
    const kinds = new Set(items.map((item) => item.kind))
    expect(kinds.has("bestellung")).toBe(true)
    const withRefunds = { ...state, orders: state.orders.map((order) => order) }
    const refunded = withRefunds.orders.some((order) => order.refunds.length > 0)
    if (refunded || state.audit.length > 0) {
      expect(items.length).toBeGreaterThan(0)
    }
  })

  test("check-ins nur aus der letzten Stunde, gebündelt je Event", () => {
    const state = dashSeedCreate(new Date("2026-10-18T18:00:00+02:00"))
    const orgId = state.orgs[0]?.id ?? ""
    const now = new Date("2026-10-18T18:00:00+02:00")
    const items = dashOverviewActivityCreate({ state, orgId, now })
    const checkins = items.filter((item) => item.kind === "checkin")
    for (const item of checkins) {
      const atMs = new Date(item.at).getTime()
      expect(atMs).toBeLessThanOrEqual(now.getTime())
      expect(atMs).toBeGreaterThanOrEqual(now.getTime() - 3_600_000)
    }
    const eventIds = checkins.map((item) => item.id)
    expect(new Set(eventIds).size).toBe(eventIds.length)
  })

  test("verwirft Einträge mit Zeitstempel in der Zukunft", () => {
    const now = new Date("2026-10-18T18:00:00+02:00")
    const state = dashSeedCreate(now)
    const orgId = state.orgs[0]?.id ?? ""
    const seeded = dashOverviewActivityCreate({ state, orgId, now })
    expect(seeded.length).toBeGreaterThan(0)
    expect(seeded.every((item) => new Date(item.at).getTime() <= now.getTime())).toBe(true)

    const futureAt = new Date(now.getTime() + 3_600_000).toISOString()
    const futureState = {
      ...state,
      orders: state.orders.map((order, index) =>
        index === 0 ? { ...order, createdAt: futureAt, refunds: [] } : order,
      ),
      audit: state.audit.map((entry, index) => (index === 0 ? { ...entry, at: futureAt } : entry)),
    }
    const futureItems = dashOverviewActivityCreate({ state: futureState, orgId, now })
    expect(futureItems.every((item) => new Date(item.at).getTime() <= now.getTime())).toBe(true)
    expect(futureItems.some((item) => item.at === futureAt)).toBe(false)
  })
})
