import type { ThemeMode } from "./ThemeMode.ts"
import { themeModeDefault } from "./themeModeDefault.ts"
import { themeModeStorageKey } from "./themeModeStorageKey.ts"

export function themeModeStorageLoad(): ThemeMode {
  if (typeof localStorage === "undefined") return themeModeDefault

  let storedMode: string | null = null
  try {
    storedMode = localStorage.getItem(themeModeStorageKey)
  } catch {
    return themeModeDefault
  }

  if (storedMode === "light" || storedMode === "dark") return storedMode

  return themeModeDefault
}
