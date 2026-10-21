import * as a from "valibot"

export const apiKeyRevokeInputSchema = a.object({
  token: a.string(),
  id: a.pipe(a.string(), a.minLength(1)),
})

export type ApiKeyRevokeInput = a.InferOutput<typeof apiKeyRevokeInputSchema>
