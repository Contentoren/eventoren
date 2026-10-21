import { describe, expect, test } from "bun:test"
import { organizerDashboardBoxOfficeSaleTotalCompute } from "./organizerDashboardBoxOfficeSaleTotalCompute.ts"

describe("organizerDashboardBoxOfficeSaleTotalCompute", () => {
  test("multiplies quantity by unit price in whole cents", () => {
    expect(organizerDashboardBoxOfficeSaleTotalCompute({ quantity: 3, unitPriceCents: 2800 })).toBe(8400)
  })

  test("zero price stays zero", () => {
    expect(organizerDashboardBoxOfficeSaleTotalCompute({ quantity: 2, unitPriceCents: 0 })).toBe(0)
  })
})
