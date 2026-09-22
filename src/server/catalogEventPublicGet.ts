import { apiClientCatalogEventGetPublished, apiClientCreate } from "../client/apiClient.js"
import type { EventItem } from "../events/EventItem.js"
import { convexUrlGet } from "./convexUrlGet.js"
import { publicWebPageDataCacheCreate } from "./publicWebPageDataCacheCreate.js"

type CatalogEventPublicGetInput = {
  readonly eventKey: string
  readonly context?: {
    readonly convexUrl?: string
  }
}

const catalogEventPublicCaches = new Map<
  string,
  () => Promise<
    | {
        readonly success: true
        readonly data: EventItem | null
      }
    | { readonly success: false; readonly error: { readonly status: number; readonly message: string } }
  >
>()

export function catalogEventPublicGet(input: CatalogEventPublicGetInput) {
  const convexUrl = input.context?.convexUrl ?? convexUrlGet()
  const cacheKey = `${convexUrl}\u0000${input.eventKey}`
  const existing = catalogEventPublicCaches.get(cacheKey)
  if (existing) return existing()

  const cache = publicWebPageDataCacheCreate({
    ttlSeconds: 0,
    query: () => apiClientCatalogEventGetPublished(input.eventKey, apiClientCreate(convexUrl)),
  })
  catalogEventPublicCaches.set(cacheKey, cache)
  return cache()
}
