import { createResult, createResultError, type PromiseResult } from "#result"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { eventorenCurrentUserRead } from "./eventorenCurrentUserRead.ts"

export async function eventorenOrganizerAccessRead(): PromiseResult<UserProfile> {
  const op = "eventorenOrganizerAccessRead"
  const userResult = await eventorenCurrentUserRead()
  if (!userResult.success) return userResult
  if (!userResult.data) return createResultError(op, "Anmeldung erforderlich")
  const role = userResult.data.role as string
  if (role !== "organizer" && role !== "admin" && role !== "dev")
    return createResultError(op, "Eventoren-Veranstalterrolle erforderlich")
  return createResult(userResult.data)
}
