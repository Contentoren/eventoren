import { eventorenLocalStorageRead } from "./eventorenLocalStorageRead.ts"
import { eventorenSsoAttemptsSchema } from "./eventorenSsoAttemptsSchema.ts"
import { eventorenSsoStorageKeys } from "./eventorenSsoStorageKeys.ts"

/** Reads the current automatic sign-in attempt count from browser storage, defaulting to 0. */
export const eventorenSsoAttemptsRead = (storage?: Storage): number => {
  const result = eventorenLocalStorageRead(eventorenSsoStorageKeys.attempts, eventorenSsoAttemptsSchema, storage)
  if (!result.success || result.data === undefined) return 0
  return result.data
}
