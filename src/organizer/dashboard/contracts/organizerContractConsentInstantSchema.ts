import * as v from "valibot"

export const organizerContractConsentInstantSchema = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.check((value) => value.includes("T") && value.endsWith("Z"), "Consent instant must use T and UTC (Z)"),
)

export type OrganizerContractConsentInstant = v.InferOutput<typeof organizerContractConsentInstantSchema>
