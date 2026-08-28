import type { Accessor } from "solid-js"
import { createContext } from "solid-js"
import type { ThemeMode } from "./ThemeMode.ts"
import { themeModeDefault } from "./themeModeDefault.ts"
import { themeModeResolve } from "./themeModeResolve.ts"

type ThemeContextValue = {
  mode: Accessor<ThemeMode>
  resolvedMode: Accessor<ThemeMode>
  selectMode: (mode: ThemeMode) => void
}

const themeContextDefault: ThemeContextValue = {
  mode: () => themeModeDefault,
  resolvedMode: () => themeModeResolve(themeModeDefault),
  selectMode: () => undefined,
}

export const themeContext = createContext<ThemeContextValue>(themeContextDefault)
