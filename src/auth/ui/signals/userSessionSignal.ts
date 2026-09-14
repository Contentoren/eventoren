import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { type UserSession, userSessionSchema } from "#src/auth/model/UserSession.ts"
import { userRole } from "#src/auth/model_field/userRole.ts"
import { userSessionsSignal } from "#src/auth/ui/signals/userSessionsSignal.ts"
import { createSignalObject, type SetterSimplified, type SignalObject } from "#ui/utils/createSignalObject.ts"

const userSessionsSessionStorageKey = "userSession"

export const userSessionSignal: SignalObject<UserSession | null> = createUserSessionsSignal()

export function userSessionGet(): UserSession {
  return userSessionSignal.get() as UserSession
}

export function userTokenGet(): string {
  const session = userSessionSignal.get()
  if (!session) return ""
  return session.token
}

function createUserSessionsSignal(): SignalObject<UserSession | null> {
  const signal = createSignalObject<UserSession | null>(null)

  // Load from localStorage if not already loaded
  const result = userSessionLoadFromSessionStorage()
  if (result.success) {
    signal.set(result.data)
  } else {
    const autoLoginSession = autoLoginIfUserRoleOnly()
    if (autoLoginSession) {
      signal.set(autoLoginSession)
    }
  }

  // Override the set method to also save to localStorage
  const originalSet: SetterSimplified<UserSession | null> = signal.set
  signal.set = (value) => {
    const result = originalSet(value)
    userSessionSaveToSessionStorage(value)
    return result
  }

  return signal
}

export function autoLoginIfUserRoleOnly(): UserSession | null {
  const sessions = userSessionsSignal.get()
  return shouldAutologin(sessions)
}

function shouldAutologin(sessions: UserSession[]): UserSession | null {
  if (sessions.length <= 0) return null
  if (sessions.length >= 2) return null
  // const isSingle = sessions.length === 1
  const single = sessions[0]
  if (!single) return null
  const hasUserRole = single.profile.role == userRole.user
  if (!hasUserRole) return null
  return single
}

function userSessionLoadFromSessionStorage(): Result<UserSession> {
  const op = "userSessionsLoadFromLocalStorage"
  if (typeof sessionStorage === "undefined") return createResultError(op, "sessionStorage is unavailable")
  const read = sessionStorage.getItem(userSessionsSessionStorageKey)
  if (!read) return createResultError(op, "no userSession saved in sessionStorage")
  const schema = a.pipe(a.string(), a.parseJson(), userSessionSchema)
  const parsing = a.safeParse(schema, read)
  if (!parsing.success) {
    return createResultError(op, a.summarize(parsing.issues), read)
  }
  return createResult(parsing.output)
}

function userSessionSaveToSessionStorage(sessions: UserSession | null) {
  if (typeof sessionStorage === "undefined") return
  if (sessions === null) {
    sessionStorage.removeItem(userSessionsSessionStorageKey)
    return
  }
  const serialized = JSON.stringify(sessions, null, 2)
  sessionStorage.setItem(userSessionsSessionStorageKey, serialized)
}
