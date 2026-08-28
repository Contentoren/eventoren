import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import type { TicketCartTotal } from "./TicketCartTotal.ts"

export function ticketCartTotalCalculate(cart: TicketCart, event: EventItem): TicketCartTotal {
  let quantity = 0
  let subtotalCents = 0
  let feeCents = 0

  for (const line of cart.lines) {
    const tier = event.tiers.find((candidate) => candidate.id === line.tierId)
    if (!tier) continue
    quantity += line.quantity
    subtotalCents += tier.priceCents * line.quantity
    feeCents += tier.feeCents * line.quantity
  }

  return { quantity, subtotalCents, feeCents, totalCents: subtotalCents + feeCents }
}
