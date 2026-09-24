import { createResult, createResultError, type PromiseResult } from "#result"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { userRoleIsAdmin } from "#src/auth/model_field/userRoleIsAdmin.ts"
import { eventorenCurrentUserRead } from "./eventorenCurrentUserRead.ts"

export async function eventorenAdminAccessRead(): PromiseResult<UserProfile> {
  const op = "eventorenAdminAccessRead"
  const userResult = await eventorenCurrentUserRead()
  if (!userResult.success) return userResult
  if (!userResult.data) return createResultError(op, "Anmeldung erforderlich")
  if (!userRoleIsAdmin(userResult.data.role)) return createResultError(op, "Eventoren-Adminrolle erforderlich")
  return createResult(userResult.data)
}
