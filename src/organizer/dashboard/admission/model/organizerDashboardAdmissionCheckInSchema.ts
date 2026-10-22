import * as v from "valibot"
import { organizerDashboardAdmissionEntranceSchema } from "./organizerDashboardAdmissionEntranceSchema.ts"

const ticketCode = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Bitte gib einen Ticketcode ein."),
  v.maxLength(64, "Ticketcode zu lang (höchstens 64 Zeichen)."),
)
const ticketId = v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte gib eine Ticket-ID ein."))

/** Manual check-in / revoke input. Exactly one of ticketCode / ticketId is required. */
export const organizerDashboardAdmissionCheckInSchema = v.strictObject({
  eventKey: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Ein Veranstaltungsschlüssel ist erforderlich."),
    v.maxLength(200, "Veranstaltungsschlüssel zu lang."),
  ),
  entrance: organizerDashboardAdmissionEntranceSchema,
  ticketCode: v.optional(ticketCode),
  ticketId: v.optional(ticketId),
})

export type OrganizerDashboardAdmissionCheckIn = v.InferOutput<typeof organizerDashboardAdmissionCheckInSchema>
