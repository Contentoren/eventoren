import type { EventFilter } from "../events/EventFilter.ts"

export function catalogEventListPublishedPagePublicCacheKeyGet(input: {
  readonly convexUrl: string
  readonly filter: EventFilter
  readonly paginationOpts?: { readonly numItems: number; readonly cursor: string | null }
}) {
  return `${input.convexUrl}\u0000${JSON.stringify(input.filter)}\u0000${JSON.stringify(input.paginationOpts ?? { numItems: 12, cursor: null })}`
}
