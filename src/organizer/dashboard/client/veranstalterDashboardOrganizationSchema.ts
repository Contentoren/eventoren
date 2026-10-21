import * as v from "valibot"
import { veranstalterDashboardOrganizationStatusSchema } from "./veranstalterDashboardOrganizationStatusSchema.ts"
import { veranstalterDashboardRoleSchema } from "./veranstalterDashboardRoleSchema.ts"

export const veranstalterDashboardOrganizationSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  slug: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  role: veranstalterDashboardRoleSchema,
  status: veranstalterDashboardOrganizationStatusSchema,
})

export type VeranstalterDashboardOrganization = v.InferOutput<typeof veranstalterDashboardOrganizationSchema>
