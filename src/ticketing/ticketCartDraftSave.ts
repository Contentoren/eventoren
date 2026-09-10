import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCartDraft } from "./TicketCartDraft.ts"
import { ticketCartDraftEventName } from "./ticketCartDraftEventName.ts"
import { ticketCartDraftKey } from "./ticketCartDraftKey.ts"
import { ticketCartDraftTotalQuantity } from "./ticketCartDraftTotalQuantity.ts"

const op = "ticketCartDraftSave"

export function ticketCartDraftSave(draft: TicketCartDraft): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)

  try {
    if (draft.length === 0 || ticketCartDraftTotalQuantity(draft) <= 0) {
      localStorage.removeItem(ticketCartDraftKey)
    } else {
      localStorage.setItem(ticketCartDraftKey, JSON.stringify({ version: 2, carts: draft }))
    }
  } catch (error) {
    return createResultError(op, "Warenkorb konnte nicht gespeichert werden.", error)
  }

  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(ticketCartDraftEventName))

  return createResult(null)
}
