import * as v from "valibot"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"

export const organizerContractConsentSchema = v.strictObject({
  termsAccepted: v.literal(true, "Bitte den Veranstalter-AGB ausdrücklich zustimmen."),
  dpaAccepted: v.literal(true, "Bitte der AVV ausdrücklich zustimmen."),
  termsRevision: v.literal(organizerContractDocuments.terms.revision, "Die aktuelle AGB-Fassung ist erforderlich."),
  dpaRevision: v.literal(organizerContractDocuments.dpa.revision, "Die aktuelle AVV-Fassung ist erforderlich."),
})

export type OrganizerContractConsent = v.InferOutput<typeof organizerContractConsentSchema>
