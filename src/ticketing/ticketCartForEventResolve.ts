import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"

export function ticketCartForEventResolve(event: EventItem, cart: TicketCart): TicketCart | undefined {
  const lines = cart.lines.filter((line) => line.quantity > 0 && event.tiers.some((tier) => tier.id === line.tierId))
  if (lines.length === 0) return undefined

  return { eventId: event.id, lines }
}
