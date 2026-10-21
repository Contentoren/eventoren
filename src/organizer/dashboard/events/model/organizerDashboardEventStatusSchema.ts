import * as v from "valibot"

export const organizerDashboardEventStatusSchema = v.picklist(["draft", "published", "archived"])

export type OrganizerDashboardEventStatus = v.InferOutput<typeof organizerDashboardEventStatusSchema>
