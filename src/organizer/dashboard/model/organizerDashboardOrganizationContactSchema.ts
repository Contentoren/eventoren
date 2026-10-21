import * as v from "valibot"
import { emailSchema } from "#src/utils/valibot/emailSchema.ts"
import { stringSchemaName } from "#src/utils/valibot/stringSchemaName.ts"

export const organizerDashboardOrganizationContactSchema = v.object({
  email: v.optional(emailSchema),
  phone: v.optional(stringSchemaName),
})

export type OrganizerDashboardOrganizationContact = v.InferOutput<typeof organizerDashboardOrganizationContactSchema>
