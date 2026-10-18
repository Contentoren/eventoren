import type { Result } from "#result"

import type { DashRole } from "../model/dashRoleSchema.ts"
import { dashStoreUpdate } from "./dashStoreUpdate.ts"

export function dashSessionRoleSimulate(role: DashRole | null): Result<void> {
  return dashStoreUpdate("dashSessionRoleSimulate", (draft) => {
    draft.session.simulatedRole = role
  })
}
