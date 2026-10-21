import * as v from "valibot"
import { organizerDashboardOrganizationFeeSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationFeeSchema.ts"
import { organizerDashboardOrganizationTaxSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationTaxSchema.ts"

/**
 * Strict admin tax+fee configuration input. Identity plus canonical
 * tax/fee only: status transitions live in approve/block/unblock.
 */
export const organizerDashboardAdminConfigureSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  tax: organizerDashboardOrganizationTaxSchema,
  fee: organizerDashboardOrganizationFeeSchema,
})

export type OrganizerDashboardAdminConfigure = v.InferOutput<typeof organizerDashboardAdminConfigureSchema>
