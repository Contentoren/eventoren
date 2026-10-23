import { v } from "convex/values"
import { valibotFieldToConvexValidator } from "#src/utils/convex/valibotToConvex.ts"
import { organizerContractPartySchema } from "./organizerContractPartySchema.ts"

export const organizerContractConsentTransportFields = {
  contractParty: valibotFieldToConvexValidator(organizerContractPartySchema),
  authorityConfirmed: v.boolean(),
  earlyServiceStartRequested: v.boolean(),
  feePayer: v.union(v.literal("kaeufer"), v.literal("veranstalter")),
}
