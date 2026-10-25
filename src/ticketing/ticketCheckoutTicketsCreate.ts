import type { TicketCart } from "./TicketCart.ts"
import type { TicketCheckoutCreateInput } from "./TicketCheckoutCreateInput.ts"
import { ticketActivationCodeHoldTokenGet } from "./ticketActivationCodeHoldTokenGet.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"

type CheckoutTicket = TicketCheckoutCreateInput["tickets"][number]

/**
 * Map cart lines to checkout ticket selections. Codes stay normalized; empty
 * codes are omitted. Each code line carries the caller's own stored hold
 * credential for its exact event/tier/code context; a denied store simply
 * omits the credential without failing the purchase.
 */
export function ticketCheckoutTicketsCreate(
  cart: TicketCart,
  participantNamesByEvent: Record<string, Record<string, readonly string[]> | undefined>,
): CheckoutTicket[] {
  return cart.lines
    .filter((line) => line.quantity > 0)
    .map((line) => {
      const normalized = line.activationCode ? ticketActivationCodeNormalize(line.activationCode) : ""
      const holdLookup =
        normalized.length > 0
          ? ticketActivationCodeHoldTokenGet({ eventKey: cart.eventId, tierKey: line.tierId, code: normalized })
          : undefined
      const holdToken = holdLookup?.success === true ? holdLookup.data : undefined
      return {
        tierKey: line.tierId,
        quantity: line.quantity,
        ...(normalized.length > 0 ? { activationCode: normalized } : {}),
        ...(holdToken === undefined ? {} : { activationCodeHoldToken: holdToken }),
        participantNames: [...(participantNamesByEvent[cart.eventId]?.[line.tierId] ?? [])],
      }
    })
}
