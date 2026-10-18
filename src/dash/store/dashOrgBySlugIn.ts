import type { DashOrg } from "../model/dashOrgSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"

export function dashOrgBySlugIn(state: DashState, slug: string): DashOrg | null {
  return state.orgs.find((org) => org.slug === slug) ?? null
}
