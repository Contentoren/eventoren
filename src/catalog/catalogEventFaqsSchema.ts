import * as v from "valibot"
import { catalogEventFaqItemSchema } from "./catalogEventFaqItemSchema.ts"

export const catalogEventFaqsSchema = v.pipe(
  v.array(catalogEventFaqItemSchema),
  v.maxLength(20, "At most 20 FAQ entries are allowed"),
  v.check((items) => new Set(items.map((item) => item.id)).size === items.length, "FAQ ids must be unique"),
)

export type CatalogEventFaqs = v.InferOutput<typeof catalogEventFaqsSchema>
