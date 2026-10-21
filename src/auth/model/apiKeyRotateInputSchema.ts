import * as a from "valibot"

export const apiKeyRotateInputSchema = a.object({
  token: a.string(),
  id: a.pipe(a.string(), a.minLength(1)),
})

export type ApiKeyRotateInput = a.InferOutput<typeof apiKeyRotateInputSchema>
