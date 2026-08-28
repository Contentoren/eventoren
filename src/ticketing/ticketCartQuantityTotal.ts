import type { TicketCart } from "./TicketCart.ts"

export function ticketCartQuantityTotal(cart: TicketCart): number {
  let total = 0
  for (const line of cart.lines) total += line.quantity

  return total
}
