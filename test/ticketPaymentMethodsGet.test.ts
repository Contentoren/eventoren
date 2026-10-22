import { expect, test } from "bun:test"
import { ticketPaymentMethodsGet } from "../src/ticketing/ticketPaymentMethodsGet.ts"

test("default methods carry brand icons from the assets catalog", () => {
  const brands = ticketPaymentMethodsGet([{}])
  expect(brands.map(({ method }) => method)).toEqual(["card", "klarna", "sepa_debit", "bancontact"])
  const card = brands.find(({ method }) => method === "card")
  expect(card?.label).toContain("Kredit-/Debitkarten")
  expect(card?.icons.map(({ alt }) => alt)).toEqual(["Visa", "Mastercard", "Maestro", "American Express", "Discover"])
  expect(card?.icons.every(({ image }) => image.path.startsWith("images/payment-methods/"))).toBe(true)
  expect(brands.find(({ method }) => method === "klarna")?.icons.map(({ alt }) => alt)).toEqual(["Klarna"])
  expect(brands.find(({ method }) => method === "sepa_debit")?.icons.map(({ alt }) => alt)).toEqual(["SEPA"])
})

test("methods without a brand asset render as a text badge", () => {
  const brands = ticketPaymentMethodsGet([{}])
  expect(brands.find(({ method }) => method === "bancontact")?.icons).toEqual([])
})

test("brand icons follow the same policy filter as the text hints", () => {
  expect(
    ticketPaymentMethodsGet([{ allowedStripePaymentMethods: ["sepa_debit"] }]).map(({ method }) => method),
  ).toEqual(["sepa_debit"])
  expect(
    ticketPaymentMethodsGet([
      {},
      { allowedStripePaymentMethods: ["sepa_debit", "card"] },
      { allowedStripePaymentMethods: ["sepa_debit"] },
    ]).map(({ method }) => method),
  ).toEqual(["sepa_debit"])
  expect(ticketPaymentMethodsGet([])).toEqual([])
})
