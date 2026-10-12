import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketActivationCodeComplete } from "./ticketActivationCodeComplete.ts"

export type TicketActivationCodeMissing = {
  readonly tierId: string
  readonly tierName: string
}

/** Lines with quantity but without a usable code on code-protected products. */
export function ticketActivationCodeMissing(
  event: EventItem,
  cart: TicketCart,
): readonly TicketActivationCodeMissing[] {
  return cart.lines.flatMap((line) => {
    if (line.quantity <= 0) return []
    const tier = event.tiers.find((candidate) => candidate.id === line.tierId)
    if (!tier || tier.activationCodeRequired !== true) return []
    if (line.activationCode && ticketActivationCodeComplete(line.activationCode)) return []
    return [{ tierId: tier.id, tierName: tier.name }]
  })
}
