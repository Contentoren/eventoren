import { expect, test } from "bun:test"
import { language } from "../src/app/i18n/language.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"
import { ticketCheckoutStepLabels } from "../src/ticketing/ticketCheckoutStepLabels.ts"
import { ticketCheckoutText } from "../src/ticketing/ticketCheckoutText.ts"
import { ticketOrderWalletText } from "../src/ticketing/ticketOrderWalletText.ts"

test("keeps checkout and order wallet copy German-only", () => {
  languageSignal.set(language.en)
  expect(ticketCheckoutText()).toMatchObject({
    title: "Kasse",
    orderSummary: "Bestellübersicht",
    directCheckout: "Direkt zur Kasse",
    perTicket: "pro Ticket",
    checkoutUnavailable: "Checkout nicht möglich",
    ticketAccessInvalid: "Dieser Ticket-Link ist ungültig.",
    ticketAccessNotFound: "Die Bestellung wurde nicht gefunden.",
    locale: "de",
  })
  expect(ticketCheckoutStepLabels()).toEqual({ kontakt: "Kontakt & Zahlung", bestaetigung: "Bestätigung" })
  expect(ticketOrderWalletText()).toMatchObject({
    walletTicket: "Eventoren Wallet-Ticket",
    venue: "Ort",
    paid: "Bezahlt",
    pending: "Zahlung wird bestätigt",
    failed: "Zahlung fehlgeschlagen",
    total: "Gesamt inkl. Gebühren",
    tickets: "Deine Tickets",
    participant: "Teilnehmer:in",
    qrCodeFor: "QR-Code für Ticket",
  })

  languageSignal.set(language.de)
})
