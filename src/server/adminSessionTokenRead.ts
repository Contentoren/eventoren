import { createResult, createResultError, type Result } from "#result"
import { eventorenSessionCookie } from "#src/auth/server/eventorenSessionCookie.ts"

const op = "adminSessionTokenRead"

export function adminSessionTokenRead(cookieHeader: string | undefined): Result<string> {
  const token = eventorenSessionCookie.sessionRead(cookieHeader)
  if (!token) return createResultError(op, "Anmeldung erforderlich")
  return createResult(token)
}
