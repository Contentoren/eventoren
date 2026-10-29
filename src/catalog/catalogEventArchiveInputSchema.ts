import * as v from "valibot"

export const catalogEventArchiveInputSchema = v.object({
  eventKey: v.pipe(v.string(), v.minLength(1)),
  token: v.string(),
})

export type CatalogEventArchiveInput = v.InferOutput<typeof catalogEventArchiveInputSchema>
