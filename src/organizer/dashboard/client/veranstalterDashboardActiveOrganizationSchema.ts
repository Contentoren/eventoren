import * as v from "valibot"
import { veranstalterDashboardOrganizationSchema } from "./veranstalterDashboardOrganizationSchema.ts"

export const veranstalterDashboardActiveOrganizationSchema = v.object({
  ...veranstalterDashboardOrganizationSchema.entries,
  permissions: v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
  profile: v.object({
    name: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
    slug: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  }),
})

export type VeranstalterDashboardActiveOrganization = v.InferOutput<
  typeof veranstalterDashboardActiveOrganizationSchema
>
