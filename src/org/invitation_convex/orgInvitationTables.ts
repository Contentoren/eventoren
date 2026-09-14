import { defineTable } from "convex/server"
import { orgInvitationDataSchemaFields } from "#src/org/invitation_model/orgInvitationSchema.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"

export const orgInvitationTables = {
  orgInvitations: defineTable({
    ...valibotToConvex(orgInvitationDataSchemaFields),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("invitedEmail", ["invitedEmail"])
    .index("invitationCode", ["invitationCode"]),
} as const
