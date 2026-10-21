import * as v from "valibot"
import { stringSchemaName } from "#src/utils/valibot/stringSchemaName.ts"
import { organizerDashboardIbanValidate } from "./organizerDashboardIbanValidate.ts"

export const organizerDashboardOrganizationBankSchema = v.object({
  iban: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(15),
    v.maxLength(34),
    v.check(organizerDashboardIbanValidate, "Invalid IBAN"),
  ),
  holder: stringSchemaName,
})

export type OrganizerDashboardOrganizationBank = v.InferOutput<typeof organizerDashboardOrganizationBankSchema>
