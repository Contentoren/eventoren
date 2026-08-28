import type { TicketCart } from "./TicketCart.ts"

export function ticketCartQuantitySet(cart: TicketCart, tierId: string, quantity: number): TicketCart {
  const safeQuantity = Math.max(0, Math.floor(quantity))
  const lines = cart.lines.filter((line) => line.tierId !== tierId)
  if (safeQuantity === 0) return { ...cart, lines }
  return { ...cart, lines: [...lines, { tierId, quantity: safeQuantity }] }
}
