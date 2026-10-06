import { apiClientCreate } from "../client/apiClient.ts"
import { apiClientCatalogEventListPublishedPageGet } from "../client/apiClientCatalogEventListPublishedPageGet.ts"
import type { CatalogEventListPublishedPage } from "../catalog/CatalogEventListPublishedPage.ts"
import { catalogEventListPublishedPageFill } from "../events/catalogEventListPublishedPageFill.ts"
import type { EventFilter } from "../events/EventFilter.ts"
import { catalogEventListPublishedPagePublicCacheKeyGet } from "./catalogEventListPublishedPagePublicCacheKeyGet.ts"
import { convexUrlGet } from "./convexUrlGet.ts"
import { publicWebPageDataCacheCreate } from "./publicWebPageDataCacheCreate.ts"

type CachedCataloguePageResult =
  | { readonly success: true; readonly data: CatalogEventListPublishedPage }
  | { readonly success: false; readonly error: { readonly status: number; readonly message: string } }

const catalogPageCaches = new Map<string, () => Promise<CachedCataloguePageResult>>()
const cacheLimit = 128

export function catalogEventListPublishedPagePublicCachedGet(input: {
  readonly filter: EventFilter
  readonly context?: { readonly convexUrl?: string }
}) {
  const convexUrl = input.context?.convexUrl ?? convexUrlGet()
  const cacheKey = catalogEventListPublishedPagePublicCacheKeyGet({
    convexUrl,
    filter: input.filter,
    paginationOpts: { numItems: 12, cursor: null },
  })
  let cache = catalogPageCaches.get(cacheKey)
  if (cache === undefined) {
    if (catalogPageCaches.size >= cacheLimit) catalogPageCaches.delete(catalogPageCaches.keys().next().value as string)
    cache = publicWebPageDataCacheCreate({
      ttlSeconds: 60,
      query: async () => {
        const result = await catalogEventListPublishedPageFill(
          { filter: input.filter, paginationOpts: { numItems: 12, cursor: null } },
          (pageInput) => apiClientCatalogEventListPublishedPageGet(pageInput, apiClientCreate(convexUrl)),
        )
        if (!result.success) return result
        return { success: true, data: result.data }
      },
    })
    catalogPageCaches.set(cacheKey, cache)
  }
  return cache()
}
