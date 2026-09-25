import { apiClientCreate } from "../client/apiClient.ts"
import { apiClientCatalogEventListPublishedPageGet } from "../client/apiClientCatalogEventListPublishedPageGet.ts"
import { catalogEventListPublishedPageFill } from "../events/catalogEventListPublishedPageFill.ts"
import type { EventFilter } from "../events/EventFilter.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

type CatalogEventListPublishedPagePublicGetInput = {
  readonly filter: EventFilter
  readonly paginationOpts: { readonly numItems: number; readonly cursor: string | null }
  readonly context?: { readonly convexUrl?: string }
}

export function catalogEventListPublishedPagePublicGet(input: CatalogEventListPublishedPagePublicGetInput) {
  const convexUrl = input.context?.convexUrl ?? convexUrlGet()
  const client = apiClientCreate(convexUrl)
  return catalogEventListPublishedPageFill(
    { filter: input.filter, paginationOpts: input.paginationOpts },
    (pageInput) => apiClientCatalogEventListPublishedPageGet(pageInput, client),
  )
}
