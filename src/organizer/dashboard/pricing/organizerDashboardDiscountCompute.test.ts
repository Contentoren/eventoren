import { describe, expect, test } from "bun:test"
import { organizerDashboardDiscountCompute } from "./organizerDashboardDiscountCompute.ts"

const lines = [
  { tierKey: "standard", unitPriceCents: 2000, quantity: 2 },
  { tierKey: "vip", unitPriceCents: 5000, quantity: 1 },
]

const base = {
  tierKeys: [] as readonly string[],
  maxTickets: null as number | null,
  usedTickets: 0,
  active: true,
  validFrom: null as string | null,
  validUntil: null as string | null,
  lines,
  nowIso: "2026-10-15T10:00:00.000Z",
}

describe("organizerDashboardDiscountCompute", () => {
  test("applies percent discounts in basis points over every eligible ticket", () => {
    const computed = organizerDashboardDiscountCompute({
      ...base,
      discountType: "prozent",
      discountValue: 1000,
    })
    expect(computed.success).toBe(true)
    if (!computed.success) return
    expect(computed.data).toEqual({ amountCents: 900, appliedTickets: 3 })
  })

  test("caps fixed amounts per ticket and restricts tiers", () => {
    const computed = organizerDashboardDiscountCompute({
      ...base,
      discountType: "betrag",
      discountValue: 3000,
      tierKeys: ["standard"],
    })
    expect(computed.success).toBe(true)
    if (!computed.success) return
    expect(computed.data).toEqual({ amountCents: 4000, appliedTickets: 2 })
  })

  test("discounts the most expensive tickets first when the budget is limited", () => {
    const computed = organizerDashboardDiscountCompute({
      ...base,
      discountType: "prozent",
      discountValue: 1000,
      maxTickets: 1,
    })
    expect(computed.success).toBe(true)
    if (!computed.success) return
    expect(computed.data).toEqual({ amountCents: 500, appliedTickets: 1 })
  })

  test("refuses inactive, expired and exhausted codes in German", () => {
    expect(
      organizerDashboardDiscountCompute({ ...base, discountType: "prozent", discountValue: 1000, active: false })
        .success,
    ).toBe(false)
    expect(
      organizerDashboardDiscountCompute({
        ...base,
        discountType: "prozent",
        discountValue: 1000,
        validUntil: "2026-10-14T10:00:00.000Z",
      }).success,
    ).toBe(false)
    expect(
      organizerDashboardDiscountCompute({
        ...base,
        discountType: "prozent",
        discountValue: 1000,
        maxTickets: 2,
        usedTickets: 2,
      }).success,
    ).toBe(false)
  })
})
