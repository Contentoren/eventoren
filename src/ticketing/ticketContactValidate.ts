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
  const postalCode = contact.postalCode.trim()
  const city = contact.city.trim()
  const country = contact.country.trim().toUpperCase()
  const companyName = contact.companyName.trim()
  const taxId = contact.taxId.trim().toUpperCase()

  if (firstName.length < 2) return createResultError(op, "Bitte gib deinen Vornamen an.", contact)
  if (lastName.length < 2) return createResultError(op, "Bitte gib deinen Nachnamen an.", contact)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return createResultError(op, "Bitte gib eine gültige E-Mail-Adresse an.", contact)
  if (address.length < 3) return createResultError(op, "Bitte gib deine Adresse an.", contact)
  if (!postalCode) return createResultError(op, "Bitte gib deine Postleitzahl an.", contact)
  if (!city) return createResultError(op, "Bitte gib deinen Ort an.", contact)
  if (!/^[A-Z]{2}$/.test(country)) return createResultError(op, "Bitte gib einen gültigen Ländercode an.", contact)
  if (contact.billingKind === "company" && !companyName)
    return createResultError(op, "Bitte gib den Firmennamen an.", contact)
  if (contact.billingKind === "company" && taxId && !/^[A-Z]{2}[A-Z0-9]{2,14}$/.test(taxId))
    return createResultError(op, "Bitte gib eine gültige EU-USt-IdNr. an.", contact)
  if (contact.billingKind === "company" && taxId.startsWith("DE") && !/^DE[0-9]{9}$/.test(taxId))
    return createResultError(op, "Bitte gib eine gültige EU-USt-IdNr. an.", contact)

  return createResult({
    ...contact,
    firstName,
    lastName,
    email,
    address,
    phone,
    postalCode,
    city,
    country,
    companyName,
    taxId,
  })
}
