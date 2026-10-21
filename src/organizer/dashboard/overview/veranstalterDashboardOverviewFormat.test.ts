import { describe, expect, test } from "bun:test"
import {
  veranstalterDashboardOverviewCsvCreate,
  veranstalterDashboardOverviewDeltaFormat,
  veranstalterDashboardOverviewMoneyFormat,
} from "./veranstalterDashboardOverviewFormat.ts"

describe("veranstalterDashboardOverviewFormat", () => {
  test("money renders Euro in German format", () => {
    expect(veranstalterDashboardOverviewMoneyFormat(4550)).toBe("45,50 €")
    expect(veranstalterDashboardOverviewMoneyFormat(0)).toBe("0,00 €")
  })

  test("delta renders signed percent or dash", () => {
    expect(veranstalterDashboardOverviewDeltaFormat(null)).toBe("—")
    expect(veranstalterDashboardOverviewDeltaFormat(1)).toContain("100")
    expect(veranstalterDashboardOverviewDeltaFormat(-0.5)).toContain("-50")
  })

  test("csv carries Berlin day buckets with BOM", () => {
    const csv = veranstalterDashboardOverviewCsvCreate({
      fromDay: "2026-10-19",
      toDay: "2026-10-21",
      revenueCents: 17500,
      tickets: 7,
      orders: 4,
      avgOrderCents: 4375,
      occupancyBps: 5000,
      deltas: { revenue: 1, tickets: null, orders: null, avgOrder: null },
      series: [{ day: "2026-10-21", revenueCents: 17500, tickets: 7, orders: 4 }],
      events: [],
      truncated: false,
    })
    expect(csv.startsWith("﻿")).toBe(true)
    expect(csv).toContain("Tag (Berlin);Umsatz (€);Tickets;Bestellungen")
    expect(csv).toContain("2026-10-21;175,00;7;4")
  })
})
