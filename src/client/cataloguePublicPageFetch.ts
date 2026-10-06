import type { CatalogEventListPublishedPage } from "../catalog/CatalogEventListPublishedPage.ts"
import type { EventFilter } from "../events/EventFilter.ts"
import type { ApiClientResult } from "./apiClient.ts"

export async function cataloguePublicPageFetch(
  filter: EventFilter,
): Promise<ApiClientResult<CatalogEventListPublishedPage>> {
  const search = new URLSearchParams()
  if (filter.query) search.set("q", filter.query)
  if (filter.location) search.set("ort", filter.location)
  if (filter.category !== "alle") search.set("kategorie", filter.category)
  if (filter.timeWindow !== "alle") search.set("zeitraum", filter.timeWindow)

  try {
    const response = await fetch(`/api/catalogue?${search.toString()}`)
    if (!response.ok)
      return { success: false, error: { status: response.status, message: "Public catalogue request failed." } }
    return { success: true, data: (await response.json()) as CatalogEventListPublishedPage }
  } catch {
    return { success: false, error: { status: 503, message: "Public catalogue request failed." } }
  }
}
