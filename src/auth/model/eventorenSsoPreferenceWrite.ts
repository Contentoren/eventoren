import { createResult, createResultError, type Result } from "#result"
import * as a from "valibot"
import { eventorenSsoAttemptsReset } from "./eventorenSsoAttemptsReset.ts"
import { eventorenSsoPreferenceSchema } from "./eventorenSsoPreferenceSchema.ts"
import { eventorenSsoStorageKeys } from "./eventorenSsoStorageKeys.ts"

/** Writes the browser-local automatic sign-in preference and resets the attempt budget. */
export const eventorenSsoPreferenceWrite = (enabled: boolean, storage?: Storage): Result<true> => {
  const op = "eventorenSsoPreferenceWrite"
  const parsed = a.safeParse(eventorenSsoPreferenceSchema, enabled)
  if (!parsed.success) return createResultError(op, a.summarize(parsed.issues), String(enabled))

  try {
    const target = storage ?? (typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage)
    if (target === undefined) {
      return createResultError(op, "localStorage is unavailable")
    }
    target.setItem(eventorenSsoStorageKeys.preference, JSON.stringify(parsed.output))
  } catch (error) {
    const message = error instanceof Error ? error.message : "The storage operation failed"
    return createResultError(op, `Could not write localStorage: ${message}`)
  }

  const resetResult = eventorenSsoAttemptsReset(storage)
  if (!resetResult.success) return resetResult

  return createResult(true)
}
