import { expect, test } from "bun:test"

import { dashFeeCompute } from "./dashFeeCompute.ts"

const fee = { percentBps: 500, fixedCents: 49, payer: "kaeufer" as const }

test("berechnet Gebühr und Käuferpreis bei Käufer-Gebühr", () => {
  const result = dashFeeCompute({ priceCents: 2450, fee })
  expect(result.feeCents).toBe(172)
  expect(result.buyerPaysCents).toBe(2622)
  expect(result.organizerGetsCents).toBe(2450)
})

test("berechnet Abzug bei Veranstalter-Gebühr", () => {
  const result = dashFeeCompute({ priceCents: 2450, fee: { ...fee, payer: "veranstalter" } })
  expect(result.feeCents).toBe(172)
  expect(result.buyerPaysCents).toBe(2450)
  expect(result.organizerGetsCents).toBe(2278)
})

test("Gratis-Tickets kosten keine Gebühr", () => {
  expect(dashFeeCompute({ priceCents: 0, fee })).toEqual({
    feeCents: 0,
    buyerPaysCents: 0,
    organizerGetsCents: 0,
  })
})

test("zu hohe Veranstaltergebühr bleibt sichtbar statt still auf null gekappt zu werden", () => {
  const result = dashFeeCompute({ priceCents: 10, fee: { ...fee, payer: "veranstalter" } })
  expect(result.feeCents).toBe(50)
  expect(result.organizerGetsCents).toBe(-40)
})

test("rundet prozentuale Gebühr kaufmännisch", () => {
  const result = dashFeeCompute({ priceCents: 333, fee: { ...fee, fixedCents: 0 } })
  expect(result.feeCents).toBe(17)
})
