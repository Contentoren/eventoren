import { createResultError, type Result } from "#result"

import { dashStoreGet } from "./dashStoreGet.ts"
import { dashStoreUpdate } from "./dashStoreUpdate.ts"

export function dashSessionOrgSwitch(orgId: string): Result<void> {
  const op = "dashSessionOrgSwitch"
  const state = dashStoreGet().state
  const member = state.members.find(
    (candidate) => candidate.orgId === orgId && candidate.userId === state.session.userId,
  )
  if (!member) return createResultError(op, "Du bist kein Mitglied dieser Organisation.")
  return dashStoreUpdate(op, (draft) => {
    draft.session.activeOrgId = orgId
    draft.session.simulatedRole = null
  })
}
