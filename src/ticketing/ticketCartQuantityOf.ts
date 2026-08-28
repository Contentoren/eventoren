import type { TicketCart } from "./TicketCart.ts"

export function ticketCartQuantityOf(cart: TicketCart, tierId: string): number {
  return cart.lines.find((line) => line.tierId === tierId)?.quantity ?? 0
}
