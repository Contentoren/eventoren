import type { DashRole } from "../model/dashRoleSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"
import { dashActiveOrgIn } from "./dashActiveOrgIn.ts"

export function dashActiveRoleIn(state: DashState): DashRole | null {
  if (state.session.simulatedRole) return state.session.simulatedRole
  const org = dashActiveOrgIn(state)
  if (!org) return null
  const member = state.members.find(
    (candidate) => candidate.orgId === org.id && candidate.userId === state.session.userId,
  )
  return member?.role ?? null
}
