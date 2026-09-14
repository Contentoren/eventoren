import { defineTable } from "convex/server"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { orgDataSchemaFields } from "#src/org/org_model/orgSchema.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"
import { stringSchemaId } from "#src/utils/valibot/stringSchema.ts"
import { dateTimeSchema } from "#utils/valibot/dateTimeSchema.js"

const orgResourceDataSchemaFields = {
  orgHandle: orgDataSchemaFields.orgHandle,
  resourceId: stringSchemaId,
  createdAt: dateTimeSchema,
} as const

const orgMeetingsDataSchemaFields = {
  orgHandle: orgDataSchemaFields.orgHandle,
  meetingId: stringSchemaId,
  createdAt: dateTimeSchema,
} as const

export const orgTables = {
  orgs: defineTable({
    ...valibotToConvex(orgDataSchemaFields),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("orgHandle", ["orgHandle"]),

  orgResources: defineTable({
    ...valibotToConvex(orgResourceDataSchemaFields),
    orgId: vIdOrg,
  })
    //
    .index("orgHandle", ["orgHandle"]),

  orgMeetings: defineTable({
    ...valibotToConvex(orgMeetingsDataSchemaFields),
    orgId: vIdOrg,
  })
    //
    .index("orgHandle", ["orgHandle"]),
} as const
