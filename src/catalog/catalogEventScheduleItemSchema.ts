import * as v from "valibot"
import { catalogEventFaqItemSchema } from "./catalogEventFaqItemSchema.ts"

/** A Berlin wall-clock time, not an instant; never converted using the host timezone. */
export const catalogEventScheduleItemSchema = v.object({
  id: catalogEventFaqItemSchema.entries.id,
  time: v.pipe(v.string(), v.regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Schedule time must be HH:mm (Europe/Berlin)")),
  title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  detail: v.optional(v.pipe(v.string(), v.maxLength(1000))),
})

export type CatalogEventScheduleItem = v.InferOutput<typeof catalogEventScheduleItemSchema>
