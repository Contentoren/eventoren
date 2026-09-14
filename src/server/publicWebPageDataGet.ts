import { apiClientCreate, apiClientPublicProjectInfoGet } from "../client/apiClient.js"
import { convexUrlGet } from "./convexUrlGet.js"
import { publicWebPageDataCacheCreate } from "./publicWebPageDataCacheCreate.js"

type PublicWebPageDataContext = {
  readonly convexUrl?: string
}

type PublicWebPageDataGetInput = {
  readonly context?: PublicWebPageDataContext
}

const publicWebPageDataCaches = new Map<
  string,
  () => Promise<Awaited<ReturnType<typeof apiClientPublicProjectInfoGet>>>
>()

function publicWebPageDataCacheGet(convexUrl: string) {
  const existing = publicWebPageDataCaches.get(convexUrl)
  if (existing !== undefined) return existing

  const cache = publicWebPageDataCacheCreate({
    ttlSeconds: 60,
    query: () => apiClientPublicProjectInfoGet(apiClientCreate(convexUrl)),
  })
  publicWebPageDataCaches.set(convexUrl, cache)
  return cache
}

export function publicWebPageDataGet(input: PublicWebPageDataGetInput = {}) {
  const convexUrl = input.context?.convexUrl ?? convexUrlGet()
  return publicWebPageDataCacheGet(convexUrl)()
}
