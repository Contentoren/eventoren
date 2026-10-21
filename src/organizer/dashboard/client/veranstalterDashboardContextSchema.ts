import * as v from "valibot"
import { veranstalterDashboardActiveOrganizationSchema } from "./veranstalterDashboardActiveOrganizationSchema.ts"
import { veranstalterDashboardOrganizationSchema } from "./veranstalterDashboardOrganizationSchema.ts"

export const veranstalterDashboardContextSchema = v.object({
  organizations: v.array(veranstalterDashboardOrganizationSchema),
  activeOrganization: v.nullable(veranstalterDashboardActiveOrganizationSchema),
})

export type VeranstalterDashboardContext = v.InferOutput<typeof veranstalterDashboardContextSchema>
