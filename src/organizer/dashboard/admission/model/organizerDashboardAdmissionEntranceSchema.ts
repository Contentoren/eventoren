import * as v from "valibot"

/** Entrance label shown in Berlin local time context; stored verbatim, 1–60 chars. */
export const organizerDashboardAdmissionEntranceSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Eingang angeben"),
  v.maxLength(60, "Eingang ist zu lang"),
)

export type OrganizerDashboardAdmissionEntrance = v.InferOutput<typeof organizerDashboardAdmissionEntranceSchema>
