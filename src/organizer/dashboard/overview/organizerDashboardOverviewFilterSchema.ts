import * as v from "valibot"
import { organizerDashboardBerlinDaySchema } from "#src/organizer/dashboard/finance/organizerDashboardFinanceFilterSchema.ts"

/**
 * Shared overview KPI filters. Every surface (Convex, Hono, CLI, TS client)
 * coerces through this schema. Storage and transport stay UTC ISO instants;
 * day buckets and the default window are Europe/Berlin calendar days.
 */
export const organizerDashboardOverviewFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  eventKey: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))),
  fromDay: v.optional(organizerDashboardBerlinDaySchema),
  toDay: v.optional(organizerDashboardBerlinDaySchema),
  range: v.optional(v.picklist(["7", "30", "365"])),
})

export type OrganizerDashboardOverviewFilter = v.InferOutput<typeof organizerDashboardOverviewFilterSchema>
