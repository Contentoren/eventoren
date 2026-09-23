import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketContact } from "./TicketContact.ts"
import { ticketContactDraftKey } from "./ticketContactDraftKey.ts"
import { ticketContactEmpty } from "./ticketContactEmpty.ts"

const op = "ticketContactDraftLoad"

export function ticketContactDraftLoad(): Result<TicketContact> {
  if (typeof localStorage === "undefined") return createResult(ticketContactEmpty())

  let raw: string | null = null
  try {
    raw = localStorage.getItem(ticketContactDraftKey)
  } catch (error) {
    return createResultError(op, "Entwurf konnte nicht gelesen werden.", error)
  }
  if (raw === null) return createResult(ticketContactEmpty())

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return createResultError(op, "Entwurf ist beschädigt.", error)
  }
  if (typeof parsed !== "object" || parsed === null) return createResultError(op, "Entwurf ist kein Objekt.", parsed)

  const candidate = parsed as Partial<TicketContact>
  return createResult({
    firstName: typeof candidate.firstName === "string" ? candidate.firstName : "",
    lastName: typeof candidate.lastName === "string" ? candidate.lastName : "",
    email: typeof candidate.email === "string" ? candidate.email : "",
    address: typeof candidate.address === "string" ? candidate.address : "",
    phone: typeof candidate.phone === "string" ? candidate.phone : "",
  })
}
