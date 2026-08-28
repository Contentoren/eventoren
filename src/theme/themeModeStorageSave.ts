import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { ThemeMode } from "./ThemeMode.ts"
import { themeModeStorageKey } from "./themeModeStorageKey.ts"

const op = "themeModeStorageSave"

export function themeModeStorageSave(mode: ThemeMode): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)

  try {
    localStorage.setItem(themeModeStorageKey, mode)
  } catch (error) {
    return createResultError(op, "Designeinstellung konnte nicht gespeichert werden.", error)
  }

  return createResult(null)
}
