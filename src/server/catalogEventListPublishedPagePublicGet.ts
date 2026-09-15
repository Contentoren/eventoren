import { apiClientCatalogEventListPublishedPageGet } from "../client/apiClientCatalogEventListPublishedPageGet.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import type { EventFilter } from "../events/EventFilter.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

type CatalogEventListPublishedPagePublicGetInput = {
  readonly filter: EventFilter
  readonly paginationOpts: { readonly numItems: number; readonly cursor: string | null }
  readonly context?: { readonly convexUrl?: string }
}

export function catalogEventListPublishedPagePublicGet(input: CatalogEventListPublishedPagePublicGetInput) {
  const convexUrl = input.context?.convexUrl ?? convexUrlGet()
  return apiClientCatalogEventListPublishedPageGet(
    { filter: input.filter, paginationOpts: input.paginationOpts },
    apiClientCreate(convexUrl),
  )
}
