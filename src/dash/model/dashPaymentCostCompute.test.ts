import { expect, test } from "bun:test"

import { dashPaymentCostCompute } from "./dashPaymentCostCompute.ts"

test("Karte, Apple Pay und Google Pay kosten 1,5 % + 0,25 €", () => {
  expect(dashPaymentCostCompute("karte", 10000)).toBe(175)
  expect(dashPaymentCostCompute("applepay", 10000)).toBe(175)
  expect(dashPaymentCostCompute("googlepay", 10000)).toBe(175)
  expect(dashPaymentCostCompute("karte", 2200)).toBe(58)
})

test("PayPal kostet 2,49 % + 0,35 €", () => {
  expect(dashPaymentCostCompute("paypal", 10000)).toBe(284)
  expect(dashPaymentCostCompute("paypal", 2200)).toBe(90)
})

test("SEPA kostet pauschal 0,35 €", () => {
  expect(dashPaymentCostCompute("sepa", 100)).toBe(35)
  expect(dashPaymentCostCompute("sepa", 50000)).toBe(35)
})

test("Gutschein und kostenlos kosten nichts", () => {
  expect(dashPaymentCostCompute("gutschein", 10000)).toBe(0)
  expect(dashPaymentCostCompute("kostenlos", 10000)).toBe(0)
})

test("Nullbeträge kosten nichts", () => {
  expect(dashPaymentCostCompute("karte", 0)).toBe(0)
  expect(dashPaymentCostCompute("sepa", 0)).toBe(0)
})
