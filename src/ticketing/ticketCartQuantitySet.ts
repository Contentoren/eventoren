import type { TicketCart } from "./TicketCart.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"

export function ticketCartQuantitySet(cart: TicketCart, tierId: string, quantity: number): TicketCart {
  const safeQuantity = Math.max(0, Math.floor(quantity))
  const existing = cart.lines.find((line) => line.tierId === tierId)
  const lines = cart.lines.filter((line) => line.tierId !== tierId)
  if (safeQuantity === 0) return { ...cart, lines }
  const normalized = existing?.activationCode ? ticketActivationCodeNormalize(existing.activationCode) : ""
  return {
    ...cart,
    lines: [
      ...lines,
      normalized.length > 0
        ? { tierId, quantity: safeQuantity, activationCode: normalized }
        : { tierId, quantity: safeQuantity },
    ],
  }
}
