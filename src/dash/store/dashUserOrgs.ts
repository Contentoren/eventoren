import { dashStateGet } from "./dashStateGet.ts"
import { dashUserOrgsIn, type DashUserOrg } from "./dashUserOrgsIn.ts"

export function dashUserOrgs(): Array<DashUserOrg> {
  return dashUserOrgsIn(dashStateGet())
}
