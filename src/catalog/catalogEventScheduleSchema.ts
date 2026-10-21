import * as v from "valibot"
import { catalogEventScheduleItemSchema } from "./catalogEventScheduleItemSchema.ts"

export const catalogEventScheduleSchema = v.pipe(
  v.array(catalogEventScheduleItemSchema),
  v.maxLength(50, "At most 50 schedule entries are allowed"),
  v.check((items) => new Set(items.map((item) => item.id)).size === items.length, "Schedule ids must be unique"),
)

export type CatalogEventSchedule = v.InferOutput<typeof catalogEventScheduleSchema>
