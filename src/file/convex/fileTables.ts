import { defineTable } from "convex/server"
import * as a from "valibot"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { fileSchemaFields } from "#src/file/model/fileSchema.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { fieldsSchemaCreatedAtUpdatedAtDeletedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAtDeletedAt.ts"
import { stringSchemaId } from "#src/utils/valibot/stringSchema.ts"

const fileMetaDataSchemaFields = {
  fileId: stringSchemaId,
  username: a.optional(stringSchemaId),
} as const

const fileTableDataSchemaFields = {
  ...fileMetaDataSchemaFields,
  ...fileSchemaFields,
} as const

export const fileTables = {
  files: defineTable({
    userId: vIdUser,
    ...valibotToConvex(fileTableDataSchemaFields),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAtDeletedAt),
  })
    //
    .index("fileId", ["fileId"]),
} as const
