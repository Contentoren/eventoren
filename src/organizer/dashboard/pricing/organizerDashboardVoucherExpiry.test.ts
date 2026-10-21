import { describe, expect, test } from "bun:test"
import { adminEventReleaseDateTimeFromIso } from "#src/admin/adminEventReleaseDateTimeFromIso.ts"
import { organizerDashboardVoucherExpiry } from "./organizerDashboardVoucherExpiry.ts"

describe("organizerDashboardVoucherExpiry", () => {
  test("computes Berlin end-of-day expiries for year-based validity", () => {
    const oneYear = organizerDashboardVoucherExpiry("2026-03-15T10:00:00.000Z", "1-jahr", null)
    expect(oneYear).not.toBeNull()
    expect(adminEventReleaseDateTimeFromIso(oneYear as string)).toBe("2027-03-15T23:59")
    const yearEnd = organizerDashboardVoucherExpiry("2026-03-15T10:00:00.000Z", "3-jahre-jahresende", null)
    expect(yearEnd).not.toBeNull()
    expect(adminEventReleaseDateTimeFromIso(yearEnd as string)).toBe("2029-12-31T23:59")
  })

  test("returns null for unlimited validity and Berlin midnight for custom dates", () => {
    expect(organizerDashboardVoucherExpiry("2026-03-15T10:00:00.000Z", "unbegrenzt", null)).toBeNull()
    const custom = organizerDashboardVoucherExpiry("2026-03-15T10:00:00.000Z", "datum", "2027-06-30")
    expect(custom).not.toBeNull()
    expect(adminEventReleaseDateTimeFromIso(custom as string)).toBe("2027-06-30T23:59")
  })

  test("rejects invalid creation instants and custom dates", () => {
    expect(organizerDashboardVoucherExpiry("kein-datum", "1-jahr", null)).toBeNull()
    expect(organizerDashboardVoucherExpiry("2026-03-15T10:00:00.000Z", "datum", "30.06.2027")).toBeNull()
    expect(organizerDashboardVoucherExpiry("2026-03-15T10:00:00.000Z", "datum", null)).toBeNull()
  })
})
