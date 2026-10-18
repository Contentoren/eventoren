import type { DashPermission } from "../model/dashPermissionSchema.ts"
import { dashCanIn } from "./dashCanIn.ts"
import { dashStateGet } from "./dashStateGet.ts"

export function dashCan(permission: DashPermission): boolean {
  return dashCanIn(dashStateGet(), permission)
}
