import { useMatches } from "@tanstack/solid-router"
import { useLocation } from "@tanstack/solid-router"
import { rootFooterShouldRender } from "./rootFooterShouldRender.ts"

export function rootFooterStateCreate() {
  const matches = useMatches()
  const location = useLocation()

  return {
    shouldRender: () => rootFooterShouldRender(matches()),
    linkHref: () => (location().pathname.startsWith("/demo") ? demoRootFooterHref : undefined),
  }
}

function demoRootFooterHref(href: string) {
  if (href === "/impressum") return "/demo/impressum"
  if (href === "/datenschutz") return "/demo/datenschutz"
  if (href === "/terms") return "/demo/terms"
  return "/demo/privacy"
}
