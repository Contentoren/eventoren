import type { EventHighlight } from "./EventHighlight.ts"
import type { EventItem } from "./EventItem.ts"
import { eventHighlightDetailByTag } from "./eventHighlightDetailByTag.ts"

export function eventHighlightsGet(event: Pick<EventItem, "highlights" | "tags">): readonly EventHighlight[] {
  if (event.highlights) return event.highlights
  return event.tags.map((tag) => {
    const detail = eventHighlightDetailByTag(tag)
    return { title: detail.title, description: detail.detail }
  })
}
