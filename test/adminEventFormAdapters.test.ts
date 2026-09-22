import { describe, expect, test } from "bun:test"
import { adminDateTimeIsoFromLocal } from "../src/admin/adminDateTimeIsoFromLocal.ts"
import { adminDateTimeLocalFromIso } from "../src/admin/adminDateTimeLocalFromIso.ts"
import { adminEuroFromCents } from "../src/admin/adminEuroFromCents.ts"
import { adminEuroToCents } from "../src/admin/adminEuroToCents.ts"

describe("admin event form adapters", () => {
  test("rejects impossible and malformed local dates", () => {
    expect(adminDateTimeIsoFromLocal("2026-02-30T19:30")).toBeNull()
    expect(adminDateTimeIsoFromLocal("2026-12-01 19:30")).toBeNull()
    expect(adminDateTimeLocalFromIso("not-a-date")).toBe("")
  })

  test("preserves the represented instant through the local date control", () => {
    const iso = "2027-04-16T21:00:00+02:00"
    const localValue = adminDateTimeLocalFromIso(iso)
    expect(adminDateTimeIsoFromLocal(localValue)).toBe(new Date(iso).toISOString())
  })

  test("serializes decimal comma, decimal point and zero as integer cents", () => {
    expect(adminEuroToCents("25,00")).toBe(2500)
    expect(adminEuroToCents("25,01")).toBe(2501)
    expect(adminEuroToCents("12,34")).toBe(1234)
    expect(adminEuroToCents("12.3")).toBe(1230)
    expect(adminEuroToCents("0")).toBe(0)
    expect(adminEuroFromCents(0)).toBe("0,00")
    expect(adminEuroFromCents(1234)).toBe("12,34")
  })

  test("rejects euro values with cent precision loss", () => {
    expect(adminEuroToCents("1,234")).toBeNull()
    expect(adminEuroToCents("0.001")).toBeNull()
    expect(adminEuroToCents("-1,00")).toBeNull()
  })
})
