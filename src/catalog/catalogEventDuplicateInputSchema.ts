import * as v from "valibot"

export const catalogEventDuplicateInputSchema = v.object({
  eventKey: v.pipe(v.string(), v.minLength(1)),
  token: v.string(),
})

export type CatalogEventDuplicateInput = v.InferOutput<typeof catalogEventDuplicateInputSchema>
