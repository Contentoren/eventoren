import * as v from "valibot"
import { emailSchema } from "#src/utils/valibot/emailSchema.ts"

const requiredText = (max: number) => v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(max))

export const organizerContractPartySchema = v.strictObject({
  legalName: requiredText(200),
  representativeName: requiredText(200),
  streetAddress: requiredText(250),
  postalCode: requiredText(20),
  city: requiredText(100),
  countryCode: v.pipe(v.string(), v.trim(), v.regex(/^[A-Z]{2}$/)),
  email: emailSchema,
  customerType: v.picklist(["business", "consumer"]),
})

export type OrganizerContractParty = v.InferOutput<typeof organizerContractPartySchema>
