import type { JSX } from "solid-js"
import { createContext } from "solid-js"

export const adminSidebarContext = createContext<{
  readonly open: () => void
  readonly renderContent: () => JSX.Element
}>()
