import type { JSX } from "solid-js"
import { themeContext } from "./themeContext.ts"
import { themeProviderStateCreate } from "./themeProviderStateCreate.ts"

export function ThemeProvider(props: { children: JSX.Element }) {
  const state = themeProviderStateCreate()

  return <themeContext.Provider value={state.context}>{props.children}</themeContext.Provider>
}
