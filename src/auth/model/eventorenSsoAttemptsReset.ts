import { createResult, createResultError, type Result } from "#result"
import { eventorenSsoStorageKeys } from "./eventorenSsoStorageKeys.ts"

/** Resets the automatic sign-in attempt counter in browser storage. */
export const eventorenSsoAttemptsReset = (storage?: Storage): Result<true> => {
  const op = "eventorenSsoAttemptsReset"
  try {
    const target = storage ?? (typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage)
    if (target === undefined) {
      return createResultError(op, "localStorage is unavailable")
    }
    target.removeItem(eventorenSsoStorageKeys.attempts)
    return createResult(true)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The storage operation failed"
    return createResultError(op, `Could not write localStorage: ${message}`)
  }
}
