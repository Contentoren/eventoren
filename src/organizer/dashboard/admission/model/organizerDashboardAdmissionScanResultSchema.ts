import * as v from "valibot"

/** Machine-readable outcome of one admission scan attempt. */
export const organizerDashboardAdmissionScanResultSchema = v.picklist([
  "ok",
  "doppelt",
  "falsches-event",
  "unbekannt",
  "storniert",
  "unbezahlt",
])

export type OrganizerDashboardAdmissionScanResult = v.InferOutput<typeof organizerDashboardAdmissionScanResultSchema>
