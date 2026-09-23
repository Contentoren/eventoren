import { userRoleIsDev } from "#src/auth/model_field/userRole.ts"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import { isDevEnv } from "#ui/env/isDevEnv.ts"

export function hasDevMode(identity?: Pick<EventorenAuthIdentity, "role"> | null): boolean {
  if (isDevEnv()) return true
  return identity ? userRoleIsDev(identity.role) : false
}
