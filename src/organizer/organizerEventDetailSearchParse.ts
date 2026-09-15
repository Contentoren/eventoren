import * as a from "valibot"

const searchSchema = a.object({
  q: a.optional(a.string()),
  ticket: a.optional(a.string()),
})

export function organizerEventDetailSearchParse(value: unknown): a.InferOutput<typeof searchSchema> {
  const result = a.safeParse(searchSchema, value)
  return result.success ? result.output : {}
}
