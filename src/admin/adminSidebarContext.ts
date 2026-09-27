import type { JSX } from "solid-js"
import { createContext } from "solid-js"

export const adminSidebarContext = createContext<{
  readonly renderContent: () => JSX.Element
}>()
