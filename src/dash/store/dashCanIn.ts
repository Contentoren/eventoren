import type { DashPermission } from "../model/dashPermissionSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"
import { dashRolePermissions } from "../model/dashRolePermissions.ts"
import { dashActiveRoleIn } from "./dashActiveRoleIn.ts"

export function dashCanIn(state: DashState, permission: DashPermission): boolean {
  const role = dashActiveRoleIn(state)
  if (!role) return false
  return dashRolePermissions(role).has(permission)
}
