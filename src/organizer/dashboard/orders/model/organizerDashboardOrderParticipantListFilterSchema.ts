import * as v from "valibot"
import { organizerDashboardOrderListFilterSchema } from "./organizerDashboardOrderListFilterSchema.ts"

export const organizerDashboardOrderParticipantListFilterSchema = v.object({
  eventKey: organizerDashboardOrderListFilterSchema.entries.eventKey.wrapped,
  search: organizerDashboardOrderListFilterSchema.entries.search,
})
export type OrganizerDashboardOrderParticipantListFilter = v.InferOutput<
  typeof organizerDashboardOrderParticipantListFilterSchema
>
