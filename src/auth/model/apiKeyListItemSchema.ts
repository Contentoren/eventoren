import * as a from "valibot"
import type { Id } from "#convex/_generated/dataModel.js"

export const apiKeyListItemSchema = a.object({
  id: a.pipe(
    a.string(),
    a.transform((id) => id as Id<"authApiKeys">),
  ),
  name: a.string(),
  maskedCredential: a.string(),
  createdAt: a.string(),
  expiresAt: a.optional(a.string()),
  revokedAt: a.optional(a.string()),
  status: a.picklist(["active", "expired", "revoked"]),
})

export type ApiKeyListItem = a.InferOutput<typeof apiKeyListItemSchema>
