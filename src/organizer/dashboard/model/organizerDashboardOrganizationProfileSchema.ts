import * as v from "valibot"
import { orgHandleSchema } from "#src/org/org_model_field/orgHandleSchema.ts"
import { stringSchemaDescription } from "#src/utils/valibot/stringSchemaDescription.ts"
import { stringSchemaName } from "#src/utils/valibot/stringSchemaName.ts"
import { organizerDashboardOrganizationBankSchema } from "./organizerDashboardOrganizationBankSchema.ts"
import { organizerDashboardOrganizationContactSchema } from "./organizerDashboardOrganizationContactSchema.ts"
import { organizerDashboardOrganizationKindSchema } from "./organizerDashboardOrganizationKindSchema.ts"

/** Public onboarding profile. Bank, tax, fee, and contract internals live outside this schema. */
export const organizerDashboardOrganizationProfileSchema = v.object({
  name: stringSchemaName,
  slug: orgHandleSchema,
  kind: organizerDashboardOrganizationKindSchema,
  contact: v.optional(organizerDashboardOrganizationContactSchema),
  imprint: v.optional(stringSchemaDescription),
})

export type OrganizerDashboardOrganizationProfile = v.InferOutput<typeof organizerDashboardOrganizationProfileSchema>
