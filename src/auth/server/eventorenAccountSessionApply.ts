import { getRequestProtocol, setResponseHeader } from "@tanstack/solid-start/server"
import { createResult, type Result } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import { eventorenAuthIdentityCreate } from "#src/auth/model/eventorenAuthIdentityCreate.ts"
import type { UserSession } from "#src/auth/model/UserSession.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

export function eventorenAccountSessionApply(session: UserSession): Result<EventorenAuthIdentity> {
  setResponseHeader("set-cookie", eventorenSessionCookie.sessionCreate(session.token, getRequestProtocol() === "https"))
  return createResult(eventorenAuthIdentityCreate(session.profile))
}
