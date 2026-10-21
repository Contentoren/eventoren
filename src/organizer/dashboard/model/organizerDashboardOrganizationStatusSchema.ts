import * as v from "valibot"

export const organizerDashboardOrganizationStatusSchema = v.picklist(["pruefung", "aktiv", "gesperrt"])

export type OrganizerDashboardOrganizationStatus = v.InferOutput<typeof organizerDashboardOrganizationStatusSchema>
