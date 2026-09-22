import { eventorenLocalStorageRead } from "./eventorenLocalStorageRead.ts"
import { eventorenSsoPreferenceSchema } from "./eventorenSsoPreferenceSchema.ts"
import { eventorenSsoStorageKeys } from "./eventorenSsoStorageKeys.ts"

/** Reads the browser-local automatic sign-in preference, defaulting to false if absent or invalid. */
export const eventorenSsoPreferenceRead = (storage?: Storage): boolean => {
  const result = eventorenLocalStorageRead(eventorenSsoStorageKeys.preference, eventorenSsoPreferenceSchema, storage)
  if (!result.success || result.data === undefined) return false
  return result.data
}
