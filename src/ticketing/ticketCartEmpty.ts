import type { TicketCart } from "./TicketCart.ts"

export function ticketCartEmpty(eventId: string): TicketCart {
  return { eventId, lines: [] }
}
