import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import { ticketPaymentMethodOptionOf } from "./ticketPaymentMethodOptionOf.ts"

export function ticketPaymentMethodLabel(method: TicketPaymentMethod): string {
  return ticketPaymentMethodOptionOf(method).name
}
