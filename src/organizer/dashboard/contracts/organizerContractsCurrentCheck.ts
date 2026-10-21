import { organizerContractConsentInstantIsValid } from "./organizerContractConsentInstantIsValid.ts"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"

/** Requires current revisions, an accepting actor, and UTC ISO consent instants; no legacy grandfathering. */
export function organizerContractsCurrentCheck(contracts: {
  termsRevision?: string
  dpaRevision?: string
  consentedByUserId?: string
  termsConsentedAt?: string
  dpaConsentedAt?: string
}): boolean {
  return (
    contracts.termsRevision === organizerContractDocuments.terms.revision &&
    contracts.dpaRevision === organizerContractDocuments.dpa.revision &&
    Boolean(contracts.consentedByUserId?.trim()) &&
    organizerContractConsentInstantIsValid(contracts.termsConsentedAt) &&
    organizerContractConsentInstantIsValid(contracts.dpaConsentedAt)
  )
}
