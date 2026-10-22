import type { EventItem } from "../events/EventItem.ts"
import { ticketPaymentMethodsGet } from "./ticketPaymentMethodsGet.ts"

export function ticketPaymentHintsGet(events: readonly Pick<EventItem, "allowedStripePaymentMethods">[]) {
  return ticketPaymentMethodsGet(events).map(({ label }) => label)
}
