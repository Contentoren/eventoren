import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResult, createResultError, type Result } from "#result"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

export function eventorenAccountTokenRead(): Result<string> {
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return createResultError("eventorenAccountTokenRead", "Anmeldung erforderlich")
  return createResult(token)
}
