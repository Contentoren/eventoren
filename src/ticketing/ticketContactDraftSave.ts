import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCheckoutFormDraft } from "./TicketCheckoutFormDraft.ts"
import { ticketContactDraftKey } from "./ticketContactDraftKey.ts"

const op = "ticketContactDraftSave"

export function ticketContactDraftSave(draft: TicketCheckoutFormDraft | null): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)

  try {
    if (draft === null) localStorage.removeItem(ticketContactDraftKey)
    else
      localStorage.setItem(
        ticketContactDraftKey,
        JSON.stringify({
          contact: draft.contact,
          participantNames: draft.participantNames,
          documentSetRevision: draft.documentSetRevision,
        }),
      )
  } catch (error) {
    return createResultError(op, "Entwurf konnte nicht gespeichert werden.", error)
  }
  return createResult(null)
}
