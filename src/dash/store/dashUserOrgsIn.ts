import type { DashMember } from "../model/dashMemberSchema.ts"
import type { DashOrg } from "../model/dashOrgSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"

export type DashUserOrg = { org: DashOrg; member: DashMember }

export function dashUserOrgsIn(state: DashState): Array<DashUserOrg> {
  const userId = state.session.userId
  const orgs: Array<DashUserOrg> = []
  for (const member of state.members) {
    if (member.userId !== userId) continue
    const org = state.orgs.find((candidate) => candidate.id === member.orgId)
    if (!org) continue
    orgs.push({ org, member })
  }
  return orgs
}
