import * as v from "valibot"

export const organizerDashboardOrganizationKindSchema = v.picklist(["verein", "unternehmen", "schule", "privat"])

export type OrganizerDashboardOrganizationKind = v.InferOutput<typeof organizerDashboardOrganizationKindSchema>
