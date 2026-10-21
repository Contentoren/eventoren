import * as v from "valibot"
import { organizerDashboardEventStatsFilterSchema } from "../overview/organizerDashboardEventStatsFilterSchema.ts"
import { organizerDashboardOverviewFilterSchema } from "../overview/organizerDashboardOverviewFilterSchema.ts"

/** Strict, credential-free transport wrappers around the canonical overview fields. */
export const organizerDashboardOverviewInputSchemas = {
  overviewGet: v.strictObject({ ...organizerDashboardOverviewFilterSchema.entries }),
  eventStatsGet: v.strictObject({ ...organizerDashboardEventStatsFilterSchema.entries }),
} as const
