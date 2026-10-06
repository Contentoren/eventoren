import { getRequestHeader } from "@tanstack/solid-start/server"
import * as a from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { type EventorenBrowserSession, eventorenBrowserSessionSchema } from "#src/auth/model/EventorenBrowserSession.ts"
import { eventorenCurrentUserReadFromToken } from "./eventorenCurrentUserReadFromToken.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"
import { verifyTokenResult } from "./jwt_token/verifyTokenResult.ts"

export async function eventorenBrowserSessionRead(): PromiseResult<EventorenBrowserSession | null> {
  const op = "eventorenBrowserSessionRead"
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return createResult(null)

  const decoded = await verifyTokenResult(token)
  if (!decoded.success || decoded.data.exp * 1000 <= Date.now()) return createResult(null)
  const profile = await eventorenCurrentUserReadFromToken(token)
  if (!profile.success) return profile
  if (!profile.data || profile.data.userId !== decoded.data.sub) return createResult(null)

  const parsed = a.safeParse(eventorenBrowserSessionSchema, {
    token,
    profile: profile.data,
    expiresAt: decoded.data.exp * 1000,
  })
  if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
  return createResult(parsed.output)
}
