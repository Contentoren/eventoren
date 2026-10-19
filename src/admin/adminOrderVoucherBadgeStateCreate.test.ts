import { describe, expect, test } from "bun:test"
import { adminOrderVoucherBadgeStateCreate } from "./adminOrderVoucherBadgeStateCreate.ts"

describe("adminOrderVoucherBadgeStateCreate", () => {
  test("null ohne Gutschein", () => {
    expect(adminOrderVoucherBadgeStateCreate(null)).toBeNull()
  })

  test("undefined ohne Gutschein", () => {
    expect(adminOrderVoucherBadgeStateCreate(undefined)).toBeNull()
  })

  test("Tooltip aus Code und eingelöstem Betrag", () => {
    const state = adminOrderVoucherBadgeStateCreate({ voucherId: "vou-1", code: "GS-TEST-10", amountCents: 3000 })
    expect(state).not.toBeNull()
    expect(state?.tooltip).toBe("GS-TEST-10 · 30,00 €")
  })

  test("Betrag de-DE EUR-formatiert", () => {
    const state = adminOrderVoucherBadgeStateCreate({ code: "GS-OHNE-ID", amountCents: 2550 })
    expect(state?.amountText).toBe("25,50 €")
  })
})
