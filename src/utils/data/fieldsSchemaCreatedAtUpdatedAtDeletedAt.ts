import * as a from "valibot"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"
import { dateTimeSchema } from "#utils/valibot/dateTimeSchema.js"

export const fieldsSchemaCreatedAtUpdatedAtDeletedAt = {
  ...fieldsSchemaCreatedAtUpdatedAt,
  deletedAt: a.optional(dateTimeSchema),
} as const
