import * as v from "valibot"

export const organizerDashboardEventSortSchema = v.picklist(["startsAtAsc", "startsAtDesc"])

export type OrganizerDashboardEventSort = v.InferOutput<typeof organizerDashboardEventSortSchema>
