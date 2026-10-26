import { createResult, createResultError, type Result } from "#result"
import type { CatalogEventListPublishedPage } from "../catalog/CatalogEventListPublishedPage.ts"
import type { ApiClientResult } from "../client/apiClient.ts"
import { apiClientCatalogEventListPublishedPageGet } from "../client/apiClientCatalogEventListPublishedPageGet.ts"
import type { EventFilter } from "../events/EventFilter.ts"
import { seoSiteUrl } from "../seo/seoSiteUrl.ts"
import type { SitemapUrlEntry } from "./sitemapUrlEntry.ts"

/** The published catalog query rejects page sizes above 50. */
const pageSize = 50

const publishedCatalogFilter: EventFilter = { query: "", location: "", category: "alle", timeWindow: "alle" }

export type SitemapCatalogPageGet = (input: {
  readonly filter: EventFilter
  readonly paginationOpts: { readonly numItems: number; readonly cursor: string | null }
}) => Promise<ApiClientResult<CatalogEventListPublishedPage>>

/**
 * Canonical sitemap entries of every published catalog event.
 *
 * The public catalog contract exposes no modification date, so event entries
 * carry no `lastmod` instead of a build stamp.
 */
export async function sitemapEventUrlListCreate(
  pageGet: SitemapCatalogPageGet = apiClientCatalogEventListPublishedPageGet,
): Promise<Result<readonly SitemapUrlEntry[]>> {
  const op = "sitemapEventUrlListCreate"
  const entries = new Map<string, SitemapUrlEntry>()
  let cursor: string | null = null

  while (true) {
    const result = await pageGet({
      filter: publishedCatalogFilter,
      paginationOpts: { numItems: pageSize, cursor },
    })
    if (!result.success) return createResultError(op, result.error.message)

    for (const event of result.data.page) {
      const loc = sitemapEventUrlGet(event.id)
      if (entries.has(loc)) continue
      entries.set(loc, { loc, changefreq: "daily", priority: 0.8 })
    }

    if (result.data.isDone) break
    if (result.data.continueCursor === cursor)
      return createResultError(op, "Published catalog page cursor did not advance")
    cursor = result.data.continueCursor
  }

  return createResult([...entries.values()])
}

function sitemapEventUrlGet(eventId: string): string {
  return new URL(`/events/${encodeURIComponent(eventId)}`, seoSiteUrl).toString()
}
