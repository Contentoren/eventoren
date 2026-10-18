import { describe, expect, test } from "bun:test"

import { dashSettlementWaterfallRows } from "./dashSettlementWaterfallRows.ts"

describe("dashSettlementWaterfallRows", () => {
  test("listet Brutto, alle Abzüge und die Auszahlung in Reihenfolge", () => {
    const rows = dashSettlementWaterfallRows({
      ticketRevenueCents: 100000,
      refundsCents: 5000,
      chargebacksCents: 2000,
      platformFeeCents: 3000,
      paymentCostsCents: 1000,
      payoutCents: 89000,
    })
    expect(rows.map((row) => row.id)).toEqual([
      "brutto",
      "erstattung",
      "rueckbuchung",
      "plattform",
      "zahlung",
      "auszahlung",
    ])
    expect(rows.filter((row) => row.negativ).map((row) => row.id)).toEqual([
      "erstattung",
      "rueckbuchung",
      "plattform",
      "zahlung",
    ])
    expect(rows.at(-1)).toMatchObject({ id: "auszahlung", cents: 89000, negativ: false, final: true })
  })

  test("lässt Abzüge mit null Cent weg", () => {
    const rows = dashSettlementWaterfallRows({
      ticketRevenueCents: 10000,
      refundsCents: 0,
      chargebacksCents: 0,
      platformFeeCents: 0,
      paymentCostsCents: 0,
      payoutCents: 10000,
    })
    expect(rows.map((row) => row.id)).toEqual(["brutto", "auszahlung"])
  })
})
