import * as v from "valibot"

import { organizerDashboardEventSortSchema } from "./organizerDashboardEventSortSchema.ts"
import { organizerDashboardEventStatusSchema } from "./organizerDashboardEventStatusSchema.ts"

export const organizerDashboardEventListFilterSchema = v.object({
  status: v.optional(organizerDashboardEventStatusSchema),
  search: v.optional(v.string()),
  sort: v.optional(organizerDashboardEventSortSchema),
  fromStartsAt: v.optional(v.pipe(v.string(), v.isoTimestamp("FromStartsAt must be a valid ISO date and time"))),
  toStartsAt: v.optional(v.pipe(v.string(), v.isoTimestamp("ToStartsAt must be a valid ISO date and time"))),
})

export type OrganizerDashboardEventListFilter = v.InferOutput<typeof organizerDashboardEventListFilterSchema>
