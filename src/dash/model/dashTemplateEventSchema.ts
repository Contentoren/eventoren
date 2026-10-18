import * as v from "valibot"

import { dashEventCategorySchema } from "./dashEventCategorySchema.ts"
import { dashFaqItemSchema } from "./dashFaqItemSchema.ts"
import { dashReminderSchema } from "./dashReminderSchema.ts"
import { dashScheduleItemSchema } from "./dashScheduleItemSchema.ts"
import { dashVenueSchema } from "./dashVenueSchema.ts"

export const dashTemplateEventSchema = v.object({
  title: v.string(),
  subtitle: v.string(),
  category: dashEventCategorySchema,
  venue: dashVenueSchema,
  description: v.string(),
  faq: v.array(dashFaqItemSchema),
  schedule: v.array(dashScheduleItemSchema),
  imageUrl: v.string(),
  imageAlt: v.string(),
  reminder: dashReminderSchema,
})

export type DashTemplateEvent = v.InferOutput<typeof dashTemplateEventSchema>
