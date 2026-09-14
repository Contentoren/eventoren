import { stt } from "#src/utils/i18n/stt.ts"

export const commonApiErrorMessages = {
  methodNotAllowed: stt("Method not allowed"),
  emptyBody: stt("Empty body"),
  schemaValidationFailed: stt("Schema validation failed"),
} as const
