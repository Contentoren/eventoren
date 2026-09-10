import type { TicketCart } from "./TicketCart.ts"
import type { TicketCartDraft } from "./TicketCartDraft.ts"

export function ticketCartDraftAddOrUpdate(draft: TicketCartDraft, cart: TicketCart): TicketCartDraft {
  const lines = cart.lines.filter((line) => line.quantity > 0)
  if (lines.length === 0) return draft.filter((entry) => entry.eventId !== cart.eventId)

  const updatedCart = { ...cart, lines }
  let updated = false
  const next: TicketCart[] = []

  for (const entry of draft) {
    if (entry.eventId !== cart.eventId) {
      next.push(entry)
      continue
    }

    if (updated) continue
    next.push(updatedCart)
    updated = true
  }

  if (!updated) next.push(updatedCart)
  return next
}
