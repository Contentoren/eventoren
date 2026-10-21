import * as v from "valibot"

export const organizerDashboardRoleSchema = v.picklist(["inhaber", "admin", "eventmanager", "finanzen", "einlass"])

export type OrganizerDashboardRole = v.InferOutput<typeof organizerDashboardRoleSchema>
