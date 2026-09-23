import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketContact } from "./TicketContact.ts"

const op = "ticketContactValidate"

export function ticketContactValidate(contact: TicketContact): Result<TicketContact> {
  const firstName = contact.firstName.trim()
  const lastName = contact.lastName.trim()
  const email = contact.email.trim()
  const address = contact.address.trim()
  const phone = contact.phone.trim()

  if (firstName.length < 2) return createResultError(op, "Bitte gib deinen Vornamen an.", contact)
  if (lastName.length < 2) return createResultError(op, "Bitte gib deinen Nachnamen an.", contact)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return createResultError(op, "Bitte gib eine gültige E-Mail-Adresse an.", contact)
  if (address.length < 3) return createResultError(op, "Bitte gib deine Adresse an.", contact)

  return createResult({ firstName, lastName, email, address, phone })
}
