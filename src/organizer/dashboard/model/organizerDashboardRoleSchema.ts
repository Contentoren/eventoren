import * as v from "valibot"

export const organizerDashboardRoleSchema = v.picklist(
  ["inhaber", "admin", "eventmanager", "finanzen", "einlass"],
  "Bitte wähle eine gültige Teamrolle.",
)

export type OrganizerDashboardRole = v.InferOutput<typeof organizerDashboardRoleSchema>
