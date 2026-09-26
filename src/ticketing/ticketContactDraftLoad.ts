import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCheckoutFormDraft } from "./TicketCheckoutFormDraft.ts"
import type { TicketContact } from "./TicketContact.ts"
import { ticketCheckoutLegalDocumentRevision } from "./ticketCheckoutLegalDocumentRevision.ts"
import { ticketContactDraftKey } from "./ticketContactDraftKey.ts"
import { ticketContactEmpty } from "./ticketContactEmpty.ts"

const op = "ticketContactDraftLoad"

export function ticketContactDraftLoad(): Result<TicketCheckoutFormDraft> {
  if (typeof localStorage === "undefined") {
    return createResult({
      contact: ticketContactEmpty(),
      participantNames: {},
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsAccepted: false,
      privacyAcknowledged: false,
    })
  }

  let raw: string | null = null
  try {
    raw = localStorage.getItem(ticketContactDraftKey)
  } catch (error) {
    return createResultError(op, "Entwurf konnte nicht gelesen werden.", error)
  }
  if (raw === null)
    return createResult({
      contact: ticketContactEmpty(),
      participantNames: {},
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsAccepted: false,
      privacyAcknowledged: false,
    })

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return createResultError(op, "Entwurf ist beschädigt.", error)
  }
  if (typeof parsed !== "object" || parsed === null) return createResultError(op, "Entwurf ist kein Objekt.", parsed)

  const candidate = parsed as Partial<TicketContact & TicketCheckoutFormDraft>
  const contactCandidate = candidate.contact ?? candidate
  const sameLegalRevision = candidate.documentSetRevision === ticketCheckoutLegalDocumentRevision
  const participantNames: Record<string, Record<string, readonly string[]>> = {}
  if (typeof candidate.participantNames === "object" && candidate.participantNames !== null) {
    for (const [eventId, eventNames] of Object.entries(candidate.participantNames)) {
      if (typeof eventNames !== "object" || eventNames === null) continue
      const validTiers: Record<string, readonly string[]> = {}
      for (const [tierId, names] of Object.entries(eventNames)) {
        if (Array.isArray(names)) validTiers[tierId] = names.map((name) => (typeof name === "string" ? name : ""))
      }
      participantNames[eventId] = validTiers
    }
  }
  return createResult({
    contact: {
      firstName: typeof contactCandidate.firstName === "string" ? contactCandidate.firstName : "",
      lastName: typeof contactCandidate.lastName === "string" ? contactCandidate.lastName : "",
      email: typeof contactCandidate.email === "string" ? contactCandidate.email : "",
      billingKind: contactCandidate.billingKind === "company" ? "company" : "person",
      companyName: typeof contactCandidate.companyName === "string" ? contactCandidate.companyName : "",
      companyExtra: typeof contactCandidate.companyExtra === "string" ? contactCandidate.companyExtra : "",
      taxId: typeof contactCandidate.taxId === "string" ? contactCandidate.taxId : "",
      address: typeof contactCandidate.address === "string" ? contactCandidate.address : "",
      addressLine2: typeof contactCandidate.addressLine2 === "string" ? contactCandidate.addressLine2 : "",
      postalCode: typeof contactCandidate.postalCode === "string" ? contactCandidate.postalCode : "",
      city: typeof contactCandidate.city === "string" ? contactCandidate.city : "",
      country: typeof contactCandidate.country === "string" ? contactCandidate.country : "",
      phone: typeof contactCandidate.phone === "string" ? contactCandidate.phone : "",
    },
    participantNames,
    documentSetRevision: ticketCheckoutLegalDocumentRevision,
    // A legacy combined acceptance is not evidence of either distinct consent.
    termsAccepted: sameLegalRevision && candidate.termsAccepted === true,
    privacyAcknowledged: sameLegalRevision && candidate.privacyAcknowledged === true,
  })
}
