import * as v from "valibot"
import { stringSchemaName } from "#src/utils/valibot/stringSchemaName.ts"
import { organizerDashboardIbanValidate } from "./organizerDashboardIbanValidate.ts"

export const organizerDashboardOrganizationBankSchema = v.object({
  iban: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(15, "Die IBAN ist zu kurz (mindestens 15 Zeichen)."),
    v.maxLength(34, "Die IBAN ist zu lang (höchstens 34 Zeichen)."),
    v.check(organizerDashboardIbanValidate, "Bitte gib eine gültige IBAN ein."),
  ),
  holder: stringSchemaName,
})

export type OrganizerDashboardOrganizationBank = v.InferOutput<typeof organizerDashboardOrganizationBankSchema>
