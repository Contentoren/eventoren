import { apiClientCatalogEventListPublishedGet, apiClientCreate } from "../client/apiClient.js"
import type { EventItem } from "../events/EventItem.js"
import { convexUrlGet } from "./convexUrlGet.js"
import { publicWebPageDataCacheCreate } from "./publicWebPageDataCacheCreate.js"

type CatalogEventsPublicGetInput = {
  readonly context?: {
    readonly convexUrl?: string
  }
}

const catalogEventsPublicCaches = new Map<
  string,
  () => Promise<
    | {
        readonly success: true
        readonly data: readonly EventItem[]
      }
    | { readonly success: false; readonly error: { readonly status: number; readonly message: string } }
  >
>()

export function catalogEventsPublicGet(input: CatalogEventsPublicGetInput = {}) {
  const convexUrl = input.context?.convexUrl ?? convexUrlGet()
  const existing = catalogEventsPublicCaches.get(convexUrl)
  if (existing) return existing()

  const cache = publicWebPageDataCacheCreate({
    ttlSeconds: 60,
    query: () => apiClientCatalogEventListPublishedGet(apiClientCreate(convexUrl)),
  })
  catalogEventsPublicCaches.set(convexUrl, cache)
  return cache()
}
