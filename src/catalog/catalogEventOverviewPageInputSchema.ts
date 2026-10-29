import * as v from "valibot"

export const catalogEventOverviewPageInputSchema = v.object({
  token: v.string(),
  eventKey: v.pipe(v.string(), v.minLength(1)),
  paginationOpts: v.object({
    numItems: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)),
    cursor: v.nullable(v.string()),
    endCursor: v.optional(v.nullable(v.string())),
    id: v.optional(v.number()),
    maximumRowsRead: v.optional(v.number()),
    maximumBytesRead: v.optional(v.number()),
  }),
})
export type CatalogEventOverviewPageInput = v.InferOutput<typeof catalogEventOverviewPageInputSchema>
