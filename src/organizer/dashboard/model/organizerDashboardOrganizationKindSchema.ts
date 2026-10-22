import * as v from "valibot"

export const organizerDashboardOrganizationKindSchema = v.picklist(
  ["verein", "unternehmen", "schule", "privat"],
  "Bitte wähle eine Art: Verein, Unternehmen, Schule oder Privatperson.",
)

export type OrganizerDashboardOrganizationKind = v.InferOutput<typeof organizerDashboardOrganizationKindSchema>
