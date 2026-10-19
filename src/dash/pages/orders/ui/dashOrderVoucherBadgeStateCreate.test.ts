import { describe, expect, test } from "bun:test"
import type { DashOrderVoucherUse } from "../../../model/dashOrderVoucherUseSchema.ts"
import type { DashVoucher } from "../../../model/dashVoucherSchema.ts"
import { dashOrderVoucherBadgeStateCreate } from "./dashOrderVoucherBadgeStateCreate.ts"

function voucherFixture(overrides: Partial<DashVoucher> = {}): DashVoucher {
  return {
    id: "vou-1",
    orgId: "org-lindenhof",
    code: "GS-TEST-10",
    initialCents: 5000,
    balanceCents: 2000,
    kind: "verkauft",
    recipientName: "Lea Schneider",
    recipientEmail: "lea@example.de",
    message: "",
    validity: "unbegrenzt",
    expiresAt: null,
    status: "aktiv",
    createdAt: "2026-10-18T10:00:00.000Z",
    redemptions: [],
    ...overrides,
  }
}

const snapshotFixture: DashOrderVoucherUse = { voucherId: "vou-1", code: "GS-TEST-10", amountCents: 3000 }
const now = () => new Date("2026-10-19T10:00:00.000Z")

describe("dashOrderVoucherBadgeStateCreate", () => {
  test("leitet Tooltip, Betrag und Restguthaben/Status aus Snapshot und Store ab", () => {
    const state = dashOrderVoucherBadgeStateCreate({
      voucher: () => snapshotFixture,
      vouchers: () => [voucherFixture()],
      now,
    })
    expect(state.hasVoucher()).toBe(true)
    expect(state.code()).toBe("GS-TEST-10")
    expect(state.amountText()).toBe("30,00 €")
    expect(state.tooltip()).toBe("GS-TEST-10 · 30,00 €")
    expect(state.detail()?.id).toBe("vou-1")
    expect(state.status()).toBe("aktiv")
    expect(state.statusLabel()).toBe("Aktiv")
    expect(state.balanceText()).toBe("20,00 €")
    expect(state.linkSearch()).toEqual({ gutschein: "vou-1" })
  })

  test("meldet eingelösten Status bei leerem Restguthaben", () => {
    const state = dashOrderVoucherBadgeStateCreate({
      voucher: () => snapshotFixture,
      vouchers: () => [voucherFixture({ balanceCents: 0, status: "eingeloest" })],
      now,
    })
    expect(state.status()).toBe("eingeloest")
    expect(state.statusLabel()).toBe("Eingelöst")
    expect(state.balanceText()).toBe("0,00 €")
  })

  test("bleibt null ohne passenden Store-Gutschein, Snapshot bleibt lesbar", () => {
    const state = dashOrderVoucherBadgeStateCreate({
      voucher: () => snapshotFixture,
      vouchers: () => [],
      now,
    })
    expect(state.hasVoucher()).toBe(true)
    expect(state.code()).toBe("GS-TEST-10")
    expect(state.amountText()).toBe("30,00 €")
    expect(state.detail()).toBeNull()
    expect(state.status()).toBeNull()
    expect(state.statusLabel()).toBeNull()
    expect(state.balanceText()).toBeNull()
    expect(state.linkSearch()).toEqual({ gutschein: "vou-1" })
  })

  test("leere Eingabe liefert leere Anzeige ohne Link", () => {
    const state = dashOrderVoucherBadgeStateCreate({ voucher: () => null, vouchers: () => [voucherFixture()], now })
    expect(state.hasVoucher()).toBe(false)
    expect(state.code()).toBe("")
    expect(state.amountText()).toBe("")
    expect(state.tooltip()).toBe("")
    expect(state.detail()).toBeNull()
    expect(state.linkSearch()).toBeNull()
  })
})
