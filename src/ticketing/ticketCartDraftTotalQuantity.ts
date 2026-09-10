import type { TicketCartDraft } from "./TicketCartDraft.ts"
import { ticketCartQuantityTotal } from "./ticketCartQuantityTotal.ts"

export function ticketCartDraftTotalQuantity(draft: TicketCartDraft): number {
  let total = 0
  for (const cart of draft) total += ticketCartQuantityTotal(cart)

  return total
}
