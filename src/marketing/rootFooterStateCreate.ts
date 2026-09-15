import { useMatches } from "@tanstack/solid-router"
import { rootFooterShouldRender } from "./rootFooterShouldRender.ts"

export function rootFooterStateCreate() {
  const matches = useMatches()

  return {
    shouldRender: () => rootFooterShouldRender(matches()),
  }
}
