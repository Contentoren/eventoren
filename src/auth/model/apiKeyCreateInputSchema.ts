import * as a from "valibot"
import { apiKeyExpiryPresetSchema } from "./apiKeyExpiryPreset.ts"

export const apiKeyCreateInputSchema = a.object({
  token: a.string(),
  name: a.string(),
  expiryPreset: a.optional(apiKeyExpiryPresetSchema),
})

export type ApiKeyCreateInput = a.InferOutput<typeof apiKeyCreateInputSchema>
