import { redirect } from "@tanstack/router-core"

type DemoLegacyRouteLocation = {
  readonly searchStr: string
  readonly hash: string
}

export function demoLegacyRouteRedirect(targetPath: string, location: DemoLegacyRouteLocation): never {
  const hash = location.hash ? `#${location.hash}` : ""
  throw redirect({ href: `${targetPath}${location.searchStr}${hash}`, replace: true })
}
