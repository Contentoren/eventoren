import type { DashRole } from "../model/dashRoleSchema.ts"
import { dashActiveRoleIn } from "./dashActiveRoleIn.ts"
import { dashStateGet } from "./dashStateGet.ts"

export function dashActiveRole(): DashRole | null {
  return dashActiveRoleIn(dashStateGet())
}
