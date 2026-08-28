import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketContact } from "./TicketContact.ts"
import { ticketContactDraftKey } from "./ticketContactDraftKey.ts"

const op = "ticketContactDraftSave"

export function ticketContactDraftSave(contact: TicketContact | null): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)

  try {
    if (contact === null) localStorage.removeItem(ticketContactDraftKey)
    else localStorage.setItem(ticketContactDraftKey, JSON.stringify(contact))
  } catch (error) {
    return createResultError(op, "Entwurf konnte nicht gespeichert werden.", error)
  }
  return createResult(null)
}
