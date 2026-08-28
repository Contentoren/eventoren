import { useContext } from "solid-js"
import { themeContext } from "./themeContext.ts"

export function themeContextUse() {
  return useContext(themeContext)
}
