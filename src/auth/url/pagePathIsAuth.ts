import { pageRouteAuth } from "./pageRouteAuth.js"

export function pagePathIsAuth(urlPath: string) {
  return Object.values(pageRouteAuth).find((p) => p === urlPath)
}
