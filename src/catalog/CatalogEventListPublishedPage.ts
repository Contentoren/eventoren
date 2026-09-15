import type { EventItem } from "../events/EventItem.ts"

export type CatalogEventListPublishedPage = {
  readonly page: readonly EventItem[]
  readonly isDone: boolean
  readonly continueCursor: string
}
