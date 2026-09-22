import { createResult, createResultError, type Result } from "#result"
import { eventorenSsoMaxAttempts } from "./eventorenSsoMaxAttempts.ts"
import { eventorenSsoStorageKeys } from "./eventorenSsoStorageKeys.ts"

/** Sets the attempt counter to the maximum to pause automatic sign-in (e.g. after deliberate logout). */
export const eventorenSsoAttemptsExhaust = (storage?: Storage): Result<true> => {
  const op = "eventorenSsoAttemptsExhaust"
  try {
    const target = storage ?? (typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage)
    if (target === undefined) {
      return createResultError(op, "localStorage is unavailable")
    }
    target.setItem(eventorenSsoStorageKeys.attempts, JSON.stringify(eventorenSsoMaxAttempts))
    return createResult(true)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The storage operation failed"
    return createResultError(op, `Could not write localStorage: ${message}`)
  }
}
