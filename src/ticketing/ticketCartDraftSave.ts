import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartDraftEventName } from "./ticketCartDraftEventName.ts"
import { ticketCartDraftKey } from "./ticketCartDraftKey.ts"
import { ticketCartQuantityTotal } from "./ticketCartQuantityTotal.ts"
import { ticketCartSearchFormat } from "./ticketCartSearchFormat.ts"

const op = "ticketCartDraftSave"

export function ticketCartDraftSave(cart: TicketCart): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)

  try {
    if (cart.eventId.length === 0 || ticketCartQuantityTotal(cart) === 0) {
      localStorage.removeItem(ticketCartDraftKey)
    } else {
      localStorage.setItem(
        ticketCartDraftKey,
        JSON.stringify({ eventId: cart.eventId, tickets: ticketCartSearchFormat(cart) }),
      )
    }
  } catch (error) {
    return createResultError(op, "Warenkorb konnte nicht gespeichert werden.", error)
  }

  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(ticketCartDraftEventName))

  return createResult(null)
}
