import * as v from "valibot"
import { catalogEventFaqsSchema } from "#src/catalog/catalogEventFaqsSchema.ts"
import { catalogEventScheduleSchema } from "#src/catalog/catalogEventScheduleSchema.ts"

const organizerDashboardEventDateSchema = v.pipe(
  v.string(),
  v.isoTimestamp("Bitte gib ein gültiges Datum mit Uhrzeit an (Europe/Berlin)."),
)

const organizerDashboardEventNonEmptySchema = v.pipe(
  v.string(),
  v.minLength(1, "Bitte ausfüllen, darf nicht leer sein."),
)

export const organizerDashboardEventCreateSchema = v.object({
  title: organizerDashboardEventNonEmptySchema,
  subtitle: v.string(),
  description: v.string(),
  category: organizerDashboardEventNonEmptySchema,
  startsAt: organizerDashboardEventDateSchema,
  endsAt: organizerDashboardEventDateSchema,
  doorsAt: organizerDashboardEventDateSchema,
  bookingOpensAt: v.optional(
    v.pipe(v.string(), v.isoTimestamp("Bitte gib ein gültiges Datum mit Uhrzeit an (Europe/Berlin).")),
  ),
  venue: organizerDashboardEventNonEmptySchema,
  city: organizerDashboardEventNonEmptySchema,
  address: v.string(),
  organizer: v.string(),
  imageUrl: v.string(),
  imageAlt: v.string(),
  tags: v.optional(v.array(v.string())),
  faqs: v.optional(catalogEventFaqsSchema),
  schedule: v.optional(catalogEventScheduleSchema),
})

export type OrganizerDashboardEventCreate = v.InferOutput<typeof organizerDashboardEventCreateSchema>
