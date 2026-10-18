import type { DashOrg } from "../model/dashOrgSchema.ts"
import { dashOrgBySlugIn } from "./dashOrgBySlugIn.ts"
import { dashStateGet } from "./dashStateGet.ts"

export function dashOrgBySlug(slug: string): DashOrg | null {
  return dashOrgBySlugIn(dashStateGet(), slug)
}
