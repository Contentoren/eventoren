import { dateTimeSchema } from "#utils/valibot/dateTimeSchema.js"

export const fieldsSchemaCreatedAtUpdatedAt = {
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
} as const
