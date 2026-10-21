import { describe, expect, test } from "bun:test"
import {
  veranstalterDashboardEventTierFormEmpty,
  veranstalterDashboardEventTierFormValidate,
} from "./veranstalterDashboardEventTierFormValidate.ts"

const validTier = {
  ...veranstalterDashboardEventTierFormEmpty,
  name: "Standard",
  description: "Stehplatz",
  priceEuros: "12,50",
  capacity: "200",
}

describe("veranstalterDashboardEventTierFormValidate rejects invalid tier input", () => {
  test("missing name fails", () => {
    const result = veranstalterDashboardEventTierFormValidate({ ...validTier, name: "" })
    expect(result.success).toBe(false)
  })

  test("negative price fails and fee stays unset", () => {
    const result = veranstalterDashboardEventTierFormValidate({ ...validTier, priceEuros: "-5" })
    expect(result.success).toBe(false)
    if (result.success) return
    expect("feeCents" in (result as unknown as Record<string, unknown>)).toBe(false)
  })

  test("three decimal places fail", () => {
    const result = veranstalterDashboardEventTierFormValidate({ ...validTier, priceEuros: "12.555" })
    expect(result.success).toBe(false)
  })

  test("negative capacity fails", () => {
    const result = veranstalterDashboardEventTierFormValidate({ ...validTier, capacity: "-1" })
    expect(result.success).toBe(false)
  })
})

describe("veranstalterDashboardEventTierFormValidate converts euros to cents", () => {
  test("comma decimal becomes integer cents without fee", () => {
    const result = veranstalterDashboardEventTierFormValidate(validTier)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.priceCents).toBe(1250)
    expect(result.data.capacity).toBe(200)
    expect("feeCents" in result.data).toBe(false)
  })
})
