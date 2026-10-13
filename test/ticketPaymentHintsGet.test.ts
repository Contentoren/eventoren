import { expect, test } from "bun:test"
import { ticketPaymentHintsGet } from "../src/ticketing/ticketPaymentHintsGet.ts"

test("SEPA-only hints exclude cards, wallets and other excluded methods", () => {
  expect(ticketPaymentHintsGet([{ allowedStripePaymentMethods: ["sepa_debit"] }])).toEqual(["SEPA-Lastschrift"])
})

test("default hints use configured methods and group wallets with cards", () => {
  const hints = ticketPaymentHintsGet([{}])
  expect(hints).toHaveLength(4)
  expect(hints[0]).toContain("Apple Pay / Google Pay")
  expect(hints.join(" ")).not.toMatch(/PayPal|iDEAL|Wero|Rechnung|Sofort/)
})

test("mixed-event bag hints never advertise a method excluded by any event", () => {
  expect(
    ticketPaymentHintsGet([
      {},
      { allowedStripePaymentMethods: ["sepa_debit", "card"] },
      { allowedStripePaymentMethods: ["sepa_debit"] },
    ]),
  ).toEqual(["SEPA-Lastschrift"])
  expect(
    ticketPaymentHintsGet([{ allowedStripePaymentMethods: ["card"] }, { allowedStripePaymentMethods: ["sepa_debit"] }]),
  ).toEqual([])
  expect(ticketPaymentHintsGet([{ allowedStripePaymentMethods: ["paypal"] }])).toEqual([])
  expect(ticketPaymentHintsGet([])).toEqual([])
})
