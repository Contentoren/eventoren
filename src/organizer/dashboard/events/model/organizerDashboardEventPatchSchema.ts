import * as v from "valibot"
import { organizerDashboardEventCreateSchema } from "./organizerDashboardEventCreateSchema.ts"

const organizerDashboardEventOptionalDateSchema = v.optional(
  v.pipe(v.string(), v.isoTimestamp("Date must be a valid ISO date and time")),
)

const organizerDashboardEventOptionalNonEmptySchema = v.optional(v.pipe(v.string(), v.minLength(1)))

export const organizerDashboardEventPatchSchema = v.object({
  title: organizerDashboardEventOptionalNonEmptySchema,
  subtitle: v.optional(v.string()),
  description: v.optional(v.string()),
  category: organizerDashboardEventOptionalNonEmptySchema,
  startsAt: organizerDashboardEventOptionalDateSchema,
  endsAt: organizerDashboardEventOptionalDateSchema,
  doorsAt: organizerDashboardEventOptionalDateSchema,
  bookingOpensAt: v.optional(v.pipe(v.string(), v.isoTimestamp("BookingOpensAt must be a valid ISO date and time"))),
  venue: organizerDashboardEventOptionalNonEmptySchema,
  city: organizerDashboardEventOptionalNonEmptySchema,
  address: v.optional(v.string()),
  organizer: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  imageAlt: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  faqs: organizerDashboardEventCreateSchema.entries.faqs,
  schedule: organizerDashboardEventCreateSchema.entries.schedule,
})

export type OrganizerDashboardEventPatch = v.InferOutput<typeof organizerDashboardEventPatchSchema>
