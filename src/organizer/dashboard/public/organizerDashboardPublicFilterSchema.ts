import * as v from "valibot"

const slug = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Cannot be empty"),
  v.maxLength(120, "Too long"),
  v.regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Ziffern und Bindestrich"),
)

/** Public organizer profile lookup by slug. No auth; only active orgs. */
export const organizerDashboardPublicProfileFilterSchema = v.strictObject({ orgSlug: slug })

export type OrganizerDashboardPublicProfileFilter = v.InferOutput<typeof organizerDashboardPublicProfileFilterSchema>

/** Public event lookup by organizer slug plus event key. No auth; only published events of active orgs. */
export const organizerDashboardPublicEventFilterSchema = v.strictObject({ orgSlug: slug, eventKey: slug })

export type OrganizerDashboardPublicEventFilter = v.InferOutput<typeof organizerDashboardPublicEventFilterSchema>
