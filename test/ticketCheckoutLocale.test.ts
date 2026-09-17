import { expect, test } from "bun:test"
import { language } from "../src/app/i18n/language.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"
import { demoText } from "../src/demo/model/demoText.ts"
import { ticketCheckoutStepLabels } from "../src/ticketing/ticketCheckoutStepLabels.ts"
import { ticketCheckoutText } from "../src/ticketing/ticketCheckoutText.ts"

test("localizes shared checkout copy and step labels", () => {
  languageSignal.set(language.en)
  expect(ticketCheckoutText()).toMatchObject({
    title: "Checkout",
    orderSummary: "Order summary",
    directCheckout: "Go directly to checkout",
    perTicket: "per ticket",
    checkoutUnavailable: "Checkout unavailable",
  })
  expect(demoText("checkoutTitle")).toBe("Checkout")
  expect(demoText("checkoutSubmitLabel")).toBe("Complete demo order")
  expect(ticketCheckoutStepLabels()).toEqual({ kontakt: "Contact & payment", bestaetigung: "Confirmation" })

  languageSignal.set(language.de)
  expect(ticketCheckoutText()).toMatchObject({
    title: "Kasse",
    orderSummary: "Bestellübersicht",
    directCheckout: "Direkt zur Kasse",
    perTicket: "pro Ticket",
    checkoutUnavailable: "Checkout nicht möglich",
  })
  expect(demoText("checkoutTitle")).toBe("Kasse")
  expect(demoText("checkoutSubmitLabel")).toBe("Demo-Bestellung abschließen")
  expect(ticketCheckoutStepLabels()).toEqual({ kontakt: "Kontakt & Zahlung", bestaetigung: "Bestätigung" })

  languageSignal.set(language.en)
})
