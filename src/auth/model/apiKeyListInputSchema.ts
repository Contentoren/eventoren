import * as a from "valibot"

const paginationOptsSchema = a.object({
  numItems: a.pipe(a.number(), a.integer(), a.minValue(1)),
  cursor: a.nullable(a.string()),
})

export const apiKeyListInputSchema = a.object({
  token: a.string(),
  paginationOpts: paginationOptsSchema,
})

export type ApiKeyListInput = a.InferOutput<typeof apiKeyListInputSchema>
