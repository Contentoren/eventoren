import type { DashOrg } from "../model/dashOrgSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"
import { dashUserOrgsIn } from "./dashUserOrgsIn.ts"

export function dashActiveOrgIn(state: DashState): DashOrg | null {
  const orgs = dashUserOrgsIn(state)
  if (orgs.length === 0) return null
  const activeId = state.session.activeOrgId
  if (activeId) {
    const active = orgs.find((entry) => entry.org.id === activeId)
    if (active) return active.org
  }
  return orgs[0]?.org ?? null
}
