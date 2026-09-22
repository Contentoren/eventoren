import { createResult, createResultError, type Result } from "#result"
import { eventorenSsoAttemptsRead } from "./eventorenSsoAttemptsRead.ts"
import { eventorenSsoMaxAttempts } from "./eventorenSsoMaxAttempts.ts"
import { eventorenSsoStorageKeys } from "./eventorenSsoStorageKeys.ts"

export type EventorenSsoAttemptResult = {
  allowed: boolean
  attempts: number
}

/**
 * Checks and records an automatic sign-in attempt. If the budget is exhausted,
 * disallows further automatic attempts without throwing or modifying the preference.
 */
export const eventorenSsoAttemptRecord = (storage?: Storage): Result<EventorenSsoAttemptResult> => {
  const op = "eventorenSsoAttemptRecord"
  const currentAttempts = eventorenSsoAttemptsRead(storage)
  if (currentAttempts >= eventorenSsoMaxAttempts) {
    return createResult({ allowed: false, attempts: currentAttempts })
  }

  const nextAttempts = currentAttempts + 1
  try {
    const target = storage ?? (typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage)
    if (target === undefined) {
      return createResultError(op, "localStorage is unavailable")
    }
    target.setItem(eventorenSsoStorageKeys.attempts, JSON.stringify(nextAttempts))
  } catch (error) {
    const message = error instanceof Error ? error.message : "The storage operation failed"
    return createResultError(op, `Could not write localStorage: ${message}`)
  }

  return createResult({ allowed: true, attempts: nextAttempts })
}
