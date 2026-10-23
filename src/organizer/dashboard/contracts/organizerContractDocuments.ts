import { organizerContractTerms } from "./organizerContractTerms.ts"
import { organizerContractDpa } from "./organizerContractDpa.ts"

/** Published texts are immutable: changes require a new revision and explicit acceptance. */
export const organizerContractDocuments = {
  terms: organizerContractTerms,
  dpa: organizerContractDpa,
} as const
