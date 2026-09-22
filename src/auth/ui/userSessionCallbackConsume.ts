import { createResult, createResultError } from "#result"
import * as a from "valibot"
import { eventorenSsoAttemptsReset } from "#src/auth/model/eventorenSsoAttemptsReset.ts"
import { type UserSession, userSessionSchema } from "#src/auth/model/UserSession.ts"
import { userSessionSignal } from "#src/auth/ui/signals/userSessionSignal.ts"
import { userSessionsSignalAdd } from "#src/auth/ui/signals/userSessionsSignal.ts"

type UserSessionCallbackConsumeOptions = {
  persist?: (userSession: UserSession) => void
  replaceUrl?: (cleanHref: string) => void
}

export function userSessionCallbackConsume(href: string, options: UserSessionCallbackConsumeOptions = {}) {
  const op = "userSessionCallbackConsume"
  let url: URL
  try {
    url = new URL(href, typeof window === "undefined" ? "https://eventoren.invalid" : window.location.origin)
  } catch {
    return createResultError(op, "invalid callback URL")
  }

  const serializedSession = url.searchParams.get("userSession")
  if (!serializedSession) return createResult({ hasUserSession: false, cleanHref: href, sessionPersisted: false })

  url.searchParams.delete("userSession")
  const cleanHref = `${url.pathname}${url.search}${url.hash}`
  const replaceUrl = options.replaceUrl ?? userSessionCallbackUrlReplace
  replaceUrl(cleanHref)

  const serializedResult = a.safeParse(a.pipe(a.string(), a.parseJson()), serializedSession)
  if (!serializedResult.success) return createResult({ hasUserSession: true, cleanHref, sessionPersisted: false })
  const sessionResult = a.safeParse(userSessionSchema, userSessionLegacyEmptyEmailNormalize(serializedResult.output))
  if (!sessionResult.success) return createResult({ hasUserSession: true, cleanHref, sessionPersisted: false })

  const persist = options.persist ?? userSessionCallbackSessionPersist
  persist(sessionResult.output)
  return createResult({ hasUserSession: true, cleanHref, sessionPersisted: true })
}

function userSessionCallbackSessionPersist(userSession: UserSession): void {
  eventorenSsoAttemptsReset()
  userSessionsSignalAdd(userSession)
  userSessionSignal.set(userSession)
}

function userSessionCallbackUrlReplace(cleanHref: string): void {
  if (typeof window === "undefined") return
  window.history.replaceState(window.history.state, "", cleanHref)
}

function userSessionLegacyEmptyEmailNormalize(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.profile) || value.profile.email !== "") return value
  const { email: _email, ...profile } = value.profile
  return { ...value, profile }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
