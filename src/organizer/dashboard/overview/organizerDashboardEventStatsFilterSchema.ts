import * as v from "valibot"

/**
 * Shared per-event KPI filters. The event is always scoped by orgId plus
 * eventKey; a foreign or missing event is refused, never guessed.
 */
export const organizerDashboardEventStatsFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
})

export type OrganizerDashboardEventStatsFilter = v.InferOutput<typeof organizerDashboardEventStatsFilterSchema>
