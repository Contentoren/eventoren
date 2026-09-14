import { defineTable } from "convex/server"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { orgRoleSchema } from "#src/org/org_model_field/orgRole.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"
import { stringSchemaId } from "#src/utils/valibot/stringSchema.ts"

const orgMemberTableDataSchemaFields = {
  orgHandle: stringSchemaId,
  role: orgRoleSchema,
  invitedBy: stringSchemaId,
} as const

export const orgMemberTables = {
  orgMembers: defineTable({
    orgId: vIdOrg,
    userId: vIdUser,
    ...valibotToConvex(orgMemberTableDataSchemaFields),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("orgId", ["orgId"])
    .index("userId", ["userId"]),
} as const
