import * as v from "valibot"

export const organizerDashboardAdminAuditActionSchema = v.picklist([
  "configured",
  "approved",
  "blocked",
  "unblocked",
  "migrated",
  "accepted",
])

export type OrganizerDashboardAdminAuditAction = v.InferOutput<typeof organizerDashboardAdminAuditActionSchema>
