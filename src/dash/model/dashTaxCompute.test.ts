import { expect, test } from "bun:test"

import { dashTaxCompute } from "./dashTaxCompute.ts"

test("teilt Brutto bei 19 % in Netto und Steuer", () => {
  const result = dashTaxCompute({ grossCents: 11900, rateBps: 1900, status: "regel" })
  expect(result.taxCents).toBe(1900)
  expect(result.netCents).toBe(10000)
})

test("teilt Brutto bei 7 % in Netto und Steuer", () => {
  const result = dashTaxCompute({ grossCents: 10700, rateBps: 700, status: "regel" })
  expect(result.taxCents).toBe(700)
  expect(result.netCents).toBe(10000)
})

test("rundet Steuer kaufmännisch", () => {
  const result = dashTaxCompute({ grossCents: 100, rateBps: 1900, status: "regel" })
  expect(result.taxCents).toBe(16)
  expect(result.netCents).toBe(84)
})

test("Kleinunternehmer weisen keine Steuer aus", () => {
  expect(dashTaxCompute({ grossCents: 2500, rateBps: 1900, status: "klein" })).toEqual({
    netCents: 2500,
    taxCents: 0,
  })
})
