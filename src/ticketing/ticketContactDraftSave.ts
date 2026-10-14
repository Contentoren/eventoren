import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCheckoutFormDraft } from "./TicketCheckoutFormDraft.ts"
import { ticketContactDraftKey } from "./ticketContactDraftKey.ts"

const op = "ticketContactDraftSave"

export function ticketContactDraftSave(draft: TicketCheckoutFormDraft | null, rememberDraft = false): Result<null> {
  try {
    if ((!rememberDraft || draft === null) && typeof localStorage !== "undefined")
      localStorage.removeItem(ticketContactDraftKey)
    if ((rememberDraft || draft === null) && typeof sessionStorage !== "undefined")
      sessionStorage.removeItem(ticketContactDraftKey)
    if (draft === null) return createResult(null)

    const storage = rememberDraft
      ? typeof localStorage === "undefined"
        ? undefined
        : localStorage
      : typeof sessionStorage === "undefined"
        ? undefined
        : sessionStorage
    storage?.setItem(
      ticketContactDraftKey,
      JSON.stringify({
        contact: draft.contact,
        participantNames: draft.participantNames,
        documentSetRevision: draft.documentSetRevision,
        rememberDraft,
      }),
    )
  } catch (error) {
    return createResultError(op, "Entwurf konnte nicht gespeichert werden.", error)
  }
  return createResult(null)
}
