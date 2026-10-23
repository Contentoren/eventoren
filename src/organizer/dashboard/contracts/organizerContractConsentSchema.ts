import * as v from "valibot"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"
import { organizerContractPartySchema } from "./organizerContractPartySchema.ts"

export const organizerContractConsentSchema = v.strictObject({
  termsAccepted: v.literal(true, "Bitte dem Veranstaltervertrag einschließlich Preisblatt ausdrücklich zustimmen."),
  dpaAccepted: v.literal(true, "Bitte der AVV ausdrücklich zustimmen."),
  termsRevision: v.literal(
    organizerContractDocuments.terms.revision,
    "Der aktuelle Veranstaltervertrag einschließlich Preisblatt ist erforderlich.",
  ),
  dpaRevision: v.literal(organizerContractDocuments.dpa.revision, "Die aktuelle AVV-Fassung ist erforderlich."),
  contractParty: organizerContractPartySchema,
  authorityConfirmed: v.literal(true, "Bitte die Vertretungsberechtigung bestätigen."),
  earlyServiceStartRequested: v.boolean(),
  feePayer: v.picklist(["kaeufer", "veranstalter"]),
})

export type OrganizerContractConsent = v.InferOutput<typeof organizerContractConsentSchema>
