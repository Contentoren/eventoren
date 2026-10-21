import * as v from "valibot"
import { organizerContractConsentInstantSchema } from "./organizerContractConsentInstantSchema.ts"

export function organizerContractConsentInstantIsValid(value: string | undefined): boolean {
  return v.safeParse(organizerContractConsentInstantSchema, value).success
}
