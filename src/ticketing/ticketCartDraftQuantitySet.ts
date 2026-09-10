import type { TicketCart } from "./TicketCart.ts"
import type { TicketCartDraft } from "./TicketCartDraft.ts"
import { ticketCartDraftAddOrUpdate } from "./ticketCartDraftAddOrUpdate.ts"
import { ticketCartEmpty } from "./ticketCartEmpty.ts"
import { ticketCartQuantitySet } from "./ticketCartQuantitySet.ts"

export function ticketCartDraftQuantitySet(
  draft: TicketCartDraft,
  eventId: string,
  tierId: string,
  quantity: number,
): TicketCartDraft {
  if (eventId.length === 0 || tierId.length === 0) return draft

  const existing = draft.find((cart) => cart.eventId === eventId) ?? ticketCartEmpty(eventId)
  const updated: TicketCart = ticketCartQuantitySet(existing, tierId, quantity)
  return ticketCartDraftAddOrUpdate(draft, updated)
}
