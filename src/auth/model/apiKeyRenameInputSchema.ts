import * as a from "valibot"

export const apiKeyRenameInputSchema = a.object({
  token: a.string(),
  id: a.pipe(a.string(), a.minLength(1)),
  name: a.string(),
})

export type ApiKeyRenameInput = a.InferOutput<typeof apiKeyRenameInputSchema>
