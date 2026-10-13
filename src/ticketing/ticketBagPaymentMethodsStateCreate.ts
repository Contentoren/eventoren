import type { EventItem } from "../events/EventItem.ts"
import { ticketPaymentHintsGet } from "./ticketPaymentHintsGet.ts"

export function ticketBagPaymentMethodsStateCreate(inputs: {
  events: () => readonly Pick<EventItem, "allowedStripePaymentMethods">[]
}) {
  return { hints: () => ticketPaymentHintsGet(inputs.events()) }
}
