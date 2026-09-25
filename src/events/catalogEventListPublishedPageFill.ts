import type { CatalogEventListPublishedPage } from "../catalog/CatalogEventListPublishedPage.ts"
import type { ApiClientResult } from "../client/apiClient.ts"
import type { EventFilter } from "./EventFilter.ts"

type PageInput = {
  readonly filter: EventFilter
  readonly paginationOpts: { readonly numItems: number; readonly cursor: string | null }
}

export async function catalogEventListPublishedPageFill(
  input: PageInput,
  pageGet: (input: PageInput) => Promise<ApiClientResult<CatalogEventListPublishedPage>>,
): Promise<ApiClientResult<CatalogEventListPublishedPage>> {
  const events: CatalogEventListPublishedPage["page"][number][] = []
  let cursor = input.paginationOpts.cursor

  while (events.length < input.paginationOpts.numItems) {
    const result = await pageGet({
      filter: input.filter,
      paginationOpts: { numItems: input.paginationOpts.numItems - events.length, cursor },
    })
    if (!result.success) return result

    events.push(...result.data.page)
    if (result.data.isDone) {
      return { success: true, data: { page: events, isDone: true, continueCursor: result.data.continueCursor } }
    }
    if (result.data.continueCursor === cursor) {
      return { success: false, error: { status: 503, message: "Published catalog page cursor did not advance" } }
    }
    cursor = result.data.continueCursor
  }

  if (cursor === null) {
    return { success: false, error: { status: 503, message: "Published catalog page cursor is missing" } }
  }
  return { success: true, data: { page: events, isDone: false, continueCursor: cursor } }
}
