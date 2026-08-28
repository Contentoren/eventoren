import type { TicketCart } from "./TicketCart.ts"

export function ticketCartSearchFormat(cart: TicketCart): string {
  return cart.lines
    .filter((line) => line.quantity > 0)
    .map((line) => `${line.tierId}:${line.quantity}`)
    .join(",")
}
