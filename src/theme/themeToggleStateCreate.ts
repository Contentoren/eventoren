import type { ThemeMode } from "./ThemeMode.ts"
import { themeContextUse } from "./themeContextUse.ts"

export function themeToggleStateCreate() {
  const theme = themeContextUse()
  const toggleLabel = () => (theme.mode() === "dark" ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln")
  const toggle = () => {
    const nextMode: ThemeMode = theme.mode() === "dark" ? "light" : "dark"
    theme.selectMode(nextMode)
  }

  return {
    mode: theme.mode,
    toggleLabel,
    toggle,
  }
}
