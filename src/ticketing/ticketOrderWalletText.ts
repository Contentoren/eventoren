import { language } from "../app/i18n/language.ts"
import { languageSignal } from "../app/i18n/languageSignal.ts"

export function ticketOrderWalletText() {
  if (languageSignal.get() === language.de) {
    return {
      walletTicket: "Eventoren Wallet-Ticket",
      venue: "Ort",
      purchaser: "Käufer:in",
      status: "Status",
      paid: "Bezahlt",
      pending: "Zahlung wird bestätigt",
      failed: "Zahlung fehlgeschlagen",
      total: "Gesamt inkl. Gebühren",
      passPending: "Der digitale Pass wird nach bestätigter Zahlung angezeigt.",
      tickets: "Deine Tickets",
      participant: "Teilnehmer:in",
      purchaserFallback: "Käufer:in",
      ticket: "Ticket",
      ticketsPlural: "Tickets",
      qrCodeFor: "QR-Code für Ticket",
    }
  }

  return {
    walletTicket: "Eventoren wallet ticket",
    venue: "Venue",
    purchaser: "Purchaser",
    status: "Status",
    paid: "Paid",
    pending: "Payment pending",
    failed: "Payment failed",
    total: "Total including fees",
    passPending: "The digital pass will be shown after payment is confirmed.",
    tickets: "Your tickets",
    participant: "Participant",
    purchaserFallback: "Purchaser",
    ticket: "Ticket",
    ticketsPlural: "Tickets",
    qrCodeFor: "QR code for ticket",
  }
}
