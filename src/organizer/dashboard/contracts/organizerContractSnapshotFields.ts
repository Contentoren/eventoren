import { v } from "convex/values"
import { valibotFieldToConvexValidator } from "#src/utils/convex/valibotToConvex.ts"
import { organizerContractPartySchema } from "./organizerContractPartySchema.ts"
import { organizerDashboardOrganizationFeeSchema } from "../model/organizerDashboardOrganizationFeeSchema.ts"

/** Optional only for historical records; all new acceptances populate every field. */
export const organizerContractSnapshotFields = {
  party: v.optional(valibotFieldToConvexValidator(organizerContractPartySchema)),
  acceptedFee: v.optional(valibotFieldToConvexValidator(organizerDashboardOrganizationFeeSchema)),
  authorityConfirmed: v.optional(v.boolean()),
  earlyServiceStartRequested: v.optional(v.boolean()),
}
