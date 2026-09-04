import type { TicketPaymentMethodOption } from "./TicketPaymentMethodOption.ts"

export const ticketPaymentMethodOptions: readonly TicketPaymentMethodOption[] = [
  {
    id: "wallet",
    name: "Apple Pay / Google Pay",
    description: "Mit Face ID, Touch ID oder Fingerabdruck in Sekunden bezahlen.",
    hint: "Schnellste Zahlung – keine Kartendaten eingeben.",
  },
  {
    id: "card",
    name: "Kreditkarte",
    description: "Visa, Mastercard und American Express.",
    hint: "3-D Secure Freigabe über deine Bank.",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Bezahlen mit deinem PayPal-Konto inkl. Käuferschutz.",
    hint: "Du wirst zur PayPal-Freigabe weitergeleitet.",
  },
  {
    id: "klarna",
    name: "Klarna",
    description: "Erst in 30 Tagen oder in Raten zahlen.",
    hint: "Bonitätsprüfung durch Klarna, Tickets sind sofort gültig.",
  },
  {
    id: "rechnung",
    name: "Rechnung / SEPA-Lastschrift",
    description: "Rechnung per E-Mail oder Einzug von deinem Konto.",
    hint: "Zahlbar innerhalb von 14 Tagen nach Erhalt.",
  },
]
