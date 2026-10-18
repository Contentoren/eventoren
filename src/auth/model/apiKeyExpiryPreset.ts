import * as a from "valibot"

export const apiKeyExpiryPresetSchema = a.picklist([
  "never",
  "1-day",
  "1-week",
  "1-month",
  "1-year",
  "2-years",
  "3-years",
])
export type ApiKeyExpiryPreset = a.InferOutput<typeof apiKeyExpiryPresetSchema>
