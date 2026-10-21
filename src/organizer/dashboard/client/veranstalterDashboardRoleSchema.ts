import type { OrganizerDashboardRole } from "../model/organizerDashboardRoleSchema.ts"
import { organizerDashboardRoleSchema } from "../model/organizerDashboardRoleSchema.ts"

/** Client alias reusing the shared production role schema — no duplicate literals. */
export const veranstalterDashboardRoleSchema = organizerDashboardRoleSchema

export type VeranstalterDashboardRole = OrganizerDashboardRole
