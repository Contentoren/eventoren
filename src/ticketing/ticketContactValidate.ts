import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketContact } from "./TicketContact.ts"

const op = "ticketContactValidate"

export function ticketContactValidate(contact: TicketContact, locale: "de" | "en" = "de"): Result<TicketContact> {
  const firstName = contact.firstName.trim()
  const lastName = contact.lastName.trim()
  const email = contact.email.trim()
  const phone = contact.phone.trim()

  if (firstName.length < 2)
    return createResultError(
      op,
      locale === "de" ? "Bitte gib deinen Vornamen an." : "Please enter your first name.",
      contact,
    )
  if (lastName.length < 2)
    return createResultError(
      op,
      locale === "de" ? "Bitte gib deinen Nachnamen an." : "Please enter your last name.",
      contact,
    )
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return createResultError(
      op,
      locale === "de" ? "Bitte gib eine gültige E-Mail-Adresse an." : "Please enter a valid email address.",
      contact,
    )

  return createResult({ firstName, lastName, email, phone })
}
