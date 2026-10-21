import * as v from "valibot"
import { organizerDashboardAdmissionEntranceSchema } from "./organizerDashboardAdmissionEntranceSchema.ts"

const ticketCode = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(64))
const ticketId = v.pipe(v.string(), v.trim(), v.nonEmpty())

/** Manual check-in / revoke input. Exactly one of ticketCode / ticketId is required. */
export const organizerDashboardAdmissionCheckInSchema = v.strictObject({
  eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  entrance: organizerDashboardAdmissionEntranceSchema,
  ticketCode: v.optional(ticketCode),
  ticketId: v.optional(ticketId),
})

export type OrganizerDashboardAdmissionCheckIn = v.InferOutput<typeof organizerDashboardAdmissionCheckInSchema>
