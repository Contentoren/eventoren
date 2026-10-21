import * as v from "valibot"

export const organizerDashboardAdminAuditAreaSchema = v.picklist([
  "tax",
  "fee",
  "configuration",
  "status",
  "organization",
  "migration",
  "contracts",
])

export type OrganizerDashboardAdminAuditArea = v.InferOutput<typeof organizerDashboardAdminAuditAreaSchema>
