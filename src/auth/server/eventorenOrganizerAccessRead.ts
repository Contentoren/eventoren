import { createResult, createResultError, type PromiseResult } from "#result"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { userRoleCanAccessOrganizer } from "#src/auth/model_field/userRole.ts"
import { eventorenCurrentUserRead } from "./eventorenCurrentUserRead.ts"

export async function eventorenOrganizerAccessRead(): PromiseResult<UserProfile> {
  const op = "eventorenOrganizerAccessRead"
  const userResult = await eventorenCurrentUserRead()
  if (!userResult.success) return userResult
  if (!userResult.data) return createResultError(op, "Anmeldung erforderlich")
  if (!userRoleCanAccessOrganizer(userResult.data.role))
    return createResultError(op, "Eventoren-Veranstalterrolle erforderlich")
  return createResult(userResult.data)
}
