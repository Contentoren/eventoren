import * as v from "valibot"
import { ticketCheckoutLegalDocumentRevision } from "./ticketCheckoutLegalDocumentRevision.ts"
import { ticketContactEmpty } from "./ticketContactEmpty.ts"

const stringField = v.optional(v.fallback(v.string(), ""), "")

export const ticketContactDraftStoredSchema = v.object({
  contact: v.fallback(
    v.object({
      firstName: stringField,
      lastName: stringField,
      email: stringField,
      billingKind: v.optional(v.fallback(v.picklist(["person", "company"]), "person"), "person"),
      companyName: stringField,
      companyExtra: stringField,
      taxId: stringField,
      address: stringField,
      addressLine2: stringField,
      postalCode: stringField,
      city: stringField,
      country: stringField,
      phone: stringField,
    }),
    ticketContactEmpty(),
  ),
  participantNames: v.optional(
    v.fallback(
      v.record(v.string(), v.fallback(v.record(v.string(), v.fallback(v.array(v.fallback(v.string(), "")), [])), {})),
      {},
    ),
    {},
  ),
  documentSetRevision: v.optional(v.string(), ticketCheckoutLegalDocumentRevision),
  rememberDraft: v.optional(v.boolean(), false),
})

export type TicketContactDraftStored = v.InferOutput<typeof ticketContactDraftStoredSchema>
