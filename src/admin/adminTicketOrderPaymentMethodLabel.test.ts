import { describe, expect, test } from "bun:test"
import { adminTicketOrderPaymentMethodLabel } from "./adminTicketOrderPaymentMethodLabel.ts"

describe("adminTicketOrderPaymentMethodLabel", () => {
  test("bildet bekannte Zahlungsarten auf deutsche Labels ab", () => {
    expect(adminTicketOrderPaymentMethodLabel("card")).toBe("Karte")
    expect(adminTicketOrderPaymentMethodLabel("sepa_debit")).toBe("SEPA")
    expect(adminTicketOrderPaymentMethodLabel("paypal")).toBe("PayPal")
  })

  test("gibt einen Gedankenstrich ohne Zahlungsart und den Rohwert bei unbekannten Typen zurück", () => {
    expect(adminTicketOrderPaymentMethodLabel(undefined)).toBe("—")
    expect(adminTicketOrderPaymentMethodLabel(null)).toBe("—")
    expect(adminTicketOrderPaymentMethodLabel("wero")).toBe("wero")
  })
})
