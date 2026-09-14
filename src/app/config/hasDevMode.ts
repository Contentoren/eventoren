import { userRoleIsDev } from "#src/auth/model_field/userRole.ts"
import { userSessionsSignal } from "#src/auth/ui/signals/userSessionsSignal.ts"
import { isDevEnv } from "#ui/env/isDevEnv.ts"

export function hasDevMode(): boolean {
  if (isDevEnv()) return true
  const sessions = userSessionsSignal.get()
  return sessions.some((s) => userRoleIsDev(s.profile.role))
}
