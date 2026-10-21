import * as v from "valibot"
import { organizerDashboardOrganizationStatusSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationStatusSchema.ts"

export type VeranstalterOrganisationenAdminSearch = {
  readonly status: v.InferOutput<typeof organizerDashboardOrganizationStatusSchema> | undefined
  readonly org: string | undefined
}

const orgIdPattern = /^[A-Za-z0-9_-]{1,100}$/

/** Pure URL search validation for the admin organisation list/detail view. */
export function veranstalterOrganisationenAdminSearchParse(input: unknown): VeranstalterOrganisationenAdminSearch {
  if (typeof input !== "object" || input === null) return { status: undefined, org: undefined }
  const record = input as Record<string, unknown>
  const status = v.safeParse(organizerDashboardOrganizationStatusSchema, record.status)
  const org = typeof record.org === "string" && orgIdPattern.test(record.org) ? record.org : undefined
  return { status: status.success ? status.output : undefined, org }
}
