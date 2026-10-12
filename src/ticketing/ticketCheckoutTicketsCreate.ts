import type { TicketCart } from "./TicketCart.ts"
import type { TicketCheckoutCreateInput } from "./TicketCheckoutCreateInput.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"

type CheckoutTicket = TicketCheckoutCreateInput["tickets"][number]

/** Map cart lines to checkout ticket selections. Codes stay normalized; empty codes are omitted. */
export function ticketCheckoutTicketsCreate(
  cart: TicketCart,
  participantNamesByEvent: Record<string, Record<string, readonly string[]> | undefined>,
): CheckoutTicket[] {
  return cart.lines
    .filter((line) => line.quantity > 0)
    .map((line) => {
      const normalized = line.activationCode ? ticketActivationCodeNormalize(line.activationCode) : ""
      return {
        tierKey: line.tierId,
        quantity: line.quantity,
        ...(normalized.length > 0 ? { activationCode: normalized } : {}),
        participantNames: [...(participantNamesByEvent[cart.eventId]?.[line.tierId] ?? [])],
      }
    })
}
