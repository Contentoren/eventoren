import * as v from "valibot"
import { organizerContractPartySchema } from "../../../contracts/organizerContractPartySchema.ts"
import { organizerDashboardOrganizationFeeSchema } from "../../../model/organizerDashboardOrganizationFeeSchema.ts"
import { organizerDashboardOrganizationKindSchema } from "../../../model/organizerDashboardOrganizationKindSchema.ts"

// Drafts deliberately allow incomplete strings. Business validation is performed
// by the shared create/party schemas on submission, never by trusting storage.
const draftText = v.pipe(v.string(), v.maxLength(10000))

export const veranstalterOnboardingDraftSchema = v.strictObject({
  name: draftText,
  slug: draftText,
  kind: organizerDashboardOrganizationKindSchema,
  contactEmail: draftText,
  contactPhone: draftText,
  imprint: draftText,
  iban: draftText,
  bankHolder: draftText,
  contractParty: v.strictObject({
    legalName: draftText,
    representativeName: draftText,
    streetAddress: draftText,
    postalCode: draftText,
    city: draftText,
    countryCode: draftText,
    email: draftText,
    customerType: organizerContractPartySchema.entries.customerType,
  }),
  feePayer: organizerDashboardOrganizationFeeSchema.entries.payer,
})

export type VeranstalterOnboardingDraft = v.InferOutput<typeof veranstalterOnboardingDraftSchema>
