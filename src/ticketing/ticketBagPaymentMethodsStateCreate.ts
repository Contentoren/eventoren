import type { EventItem } from "../events/EventItem.ts"
import { ticketPaymentHintsGet } from "./ticketPaymentHintsGet.ts"
import { ticketPaymentMethodsGet } from "./ticketPaymentMethodsGet.ts"

export function ticketBagPaymentMethodsStateCreate(inputs: {
  events: () => readonly Pick<EventItem, "allowedStripePaymentMethods">[]
}) {
  return {
    hints: () => ticketPaymentHintsGet(inputs.events()),
    brands: () => ticketPaymentMethodsGet(inputs.events()),
  }
}
