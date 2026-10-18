import * as v from "valibot"

import { dashBoxOfficeConfigSchema } from "./dashBoxOfficeConfigSchema.ts"
import { dashEventCategorySchema } from "./dashEventCategorySchema.ts"
import { dashEventStatusSchema } from "./dashEventStatusSchema.ts"
import { dashEventVisibilitySchema } from "./dashEventVisibilitySchema.ts"
import { dashFaqItemSchema } from "./dashFaqItemSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashReminderSchema } from "./dashReminderSchema.ts"
import { dashScheduleItemSchema } from "./dashScheduleItemSchema.ts"
import { dashSlugSchema } from "./dashSlugSchema.ts"
import { dashVenueSchema } from "./dashVenueSchema.ts"

export const dashEventSchema = v.object({
  id: dashIdSchema,
  orgId: dashIdSchema,
  slug: dashSlugSchema,
  title: v.string(),
  subtitle: v.string(),
  category: dashEventCategorySchema,
  startsAt: dashIsoSchema,
  endsAt: dashIsoSchema,
  doorsAt: v.nullable(dashIsoSchema),
  venue: dashVenueSchema,
  imageUrl: v.string(),
  imageAlt: v.string(),
  description: v.string(),
  faq: v.array(dashFaqItemSchema),
  schedule: v.array(dashScheduleItemSchema),
  status: dashEventStatusSchema,
  visibility: dashEventVisibilitySchema,
  salesPaused: v.boolean(),
  cancelReason: v.string(),
  boxOffice: dashBoxOfficeConfigSchema,
  reminder: dashReminderSchema,
  createdAt: dashIsoSchema,
  updatedAt: dashIsoSchema,
  publishedAt: v.nullable(dashIsoSchema),
})

export type DashEvent = v.InferOutput<typeof dashEventSchema>
