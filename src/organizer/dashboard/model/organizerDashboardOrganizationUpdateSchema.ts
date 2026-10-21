import * as v from "valibot"
import { organizerDashboardOrganizationBankSchema } from "./organizerDashboardOrganizationBankSchema.ts"
import { organizerDashboardOrganizationContactSchema } from "./organizerDashboardOrganizationContactSchema.ts"
import { organizerDashboardOrganizationKindSchema } from "./organizerDashboardOrganizationKindSchema.ts"
import { stringSchemaDescription } from "#src/utils/valibot/stringSchemaDescription.ts"
import { stringSchemaName } from "#src/utils/valibot/stringSchemaName.ts"

/**
 * Strict role-scoped update input. Identity (orgId) plus profile/bank patches only:
 * slug, status, tax, fee, and contract timestamps are never client-settable,
 * so spoofed fields fail validation before any write.
 */
export const organizerDashboardOrganizationUpdateSchema = v.pipe(
  v.strictObject({
    orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
    profile: v.optional(
      v.strictObject({
        name: v.optional(stringSchemaName),
        kind: v.optional(organizerDashboardOrganizationKindSchema),
        contact: v.optional(organizerDashboardOrganizationContactSchema),
        imprint: v.optional(stringSchemaDescription),
      }),
    ),
    bank: v.optional(organizerDashboardOrganizationBankSchema),
  }),
  v.check(
    (input) => input.profile !== undefined || input.bank !== undefined,
    "Nothing to update: provide profile or bank",
  ),
)

export type OrganizerDashboardOrganizationUpdate = v.InferOutput<typeof organizerDashboardOrganizationUpdateSchema>
