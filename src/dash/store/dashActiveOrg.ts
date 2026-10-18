import type { DashOrg } from "../model/dashOrgSchema.ts"
import { dashActiveOrgIn } from "./dashActiveOrgIn.ts"
import { dashStateGet } from "./dashStateGet.ts"

export function dashActiveOrg(): DashOrg | null {
  return dashActiveOrgIn(dashStateGet())
}
