import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import type { TicketPaymentMethodOption } from "./TicketPaymentMethodOption.ts"
import { ticketPaymentMethodOptions } from "./ticketPaymentMethodOptions.ts"

const fallback: TicketPaymentMethodOption = {
  id: "rechnung",
  name: "Rechnung / SEPA-Lastschrift",
  description: "Rechnung per E-Mail oder Einzug von deinem Konto.",
  hint: "Zahlbar innerhalb von 14 Tagen nach Erhalt.",
  badge: "Ohne Karte",
  badgeTone: "neutral",
}

export function ticketPaymentMethodOptionOf(method: TicketPaymentMethod): TicketPaymentMethodOption {
  const match = ticketPaymentMethodOptions.find((option) => option.id === method)
  return match ?? fallback
}
