import * as a from "valibot"
import { apiKeyExpiryPresetSchema } from "#src/auth/model/apiKeyExpiryPreset.ts"
import { apiKeyNameSchema } from "#src/auth/model/apiKeyNameSchema.ts"

export const mcpPaginationOptsSchema = a.object({
  numItems: a.optional(a.pipe(a.number(), a.integer(), a.minValue(1), a.maxValue(100)), 50),
  cursor: a.optional(a.nullable(a.string()), null),
})

export const mcpCatalogFilterSchema = a.object({
  query: a.optional(a.string(), ""),
  location: a.optional(a.string(), ""),
  category: a.optional(a.string(), ""),
  timeWindow: a.optional(a.picklist(["alle", "heute", "wochenende", "monat"]), "alle"),
})

export const mcpToolSchemas = {
  paginationOpts: mcpPaginationOptsSchema,
  catalogFilter: mcpCatalogFilterSchema,
  apiKeyName: apiKeyNameSchema,
  apiKeyExpiryPresetOptional: a.optional(apiKeyExpiryPresetSchema),
} as const
