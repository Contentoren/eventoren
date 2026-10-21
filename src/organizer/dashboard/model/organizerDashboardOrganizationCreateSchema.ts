import { organizerContractConsentSchema } from "../contracts/organizerContractConsentSchema.ts"
import * as v from "valibot"
import { organizerDashboardOrganizationBankSchema } from "./organizerDashboardOrganizationBankSchema.ts"
import { organizerDashboardOrganizationContactSchema } from "./organizerDashboardOrganizationContactSchema.ts"
import { organizerDashboardOrganizationKindSchema } from "./organizerDashboardOrganizationKindSchema.ts"
import { orgHandleSchema } from "#src/org/org_model_field/orgHandleSchema.ts"
import { stringSchemaDescription } from "#src/utils/valibot/stringSchemaDescription.ts"
import { stringSchemaName } from "#src/utils/valibot/stringSchemaName.ts"

/**
 * Strict onboarding input. Status, tax, fee, and timestamps are server-owned
 * and rejected here, so spoofed config fields fail validation before any write.
 */
export const organizerDashboardOrganizationCreateSchema = v.strictObject({
  name: stringSchemaName,
  slug: orgHandleSchema,
  kind: organizerDashboardOrganizationKindSchema,
  contact: v.optional(organizerDashboardOrganizationContactSchema),
  imprint: v.optional(stringSchemaDescription),
  bank: v.optional(organizerDashboardOrganizationBankSchema),
  ...organizerContractConsentSchema.entries,
})

export type OrganizerDashboardOrganizationCreate = v.InferOutput<typeof organizerDashboardOrganizationCreateSchema>
