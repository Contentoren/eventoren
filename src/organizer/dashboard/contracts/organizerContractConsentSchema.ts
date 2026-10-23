import * as v from "valibot"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"

export const organizerContractConsentSchema = v.strictObject({
  termsAccepted: v.literal(true, "Bitte den Muster-Veranstalter-AGB ausdrücklich zustimmen."),
  dpaAccepted: v.literal(true, "Bitte der Muster-AVV ausdrücklich zustimmen."),
  termsRevision: v.literal(
    organizerContractDocuments.terms.revision,
    "Die aktuelle AGB-Musterfassung ist erforderlich.",
  ),
  dpaRevision: v.literal(organizerContractDocuments.dpa.revision, "Die aktuelle AVV-Musterfassung ist erforderlich."),
})

export type OrganizerContractConsent = v.InferOutput<typeof organizerContractConsentSchema>
