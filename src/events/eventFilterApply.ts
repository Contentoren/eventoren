import type { EventFilter } from "./EventFilter.ts"
import type { EventItem } from "./EventItem.ts"
import { eventTimeWindowMatches } from "./eventTimeWindowMatches.ts"

export function eventFilterApply(
  events: readonly EventItem[],
  filter: EventFilter,
  now: Date = new Date(),
): readonly EventItem[] {
  const query = filter.query.trim().toLowerCase()
  const location = filter.location.trim().toLowerCase()

  return events.filter((event) => {
    if (filter.category !== "alle" && event.category !== filter.category) return false
    if (!eventTimeWindowMatches(event.startsAt, filter.timeWindow, now)) return false

    if (query.length > 0) {
      const haystack = [event.title, event.subtitle, event.city, event.venue, ...event.tags].join(" ").toLowerCase()
      if (!haystack.includes(query)) return false
    }

    if (location.length > 0) {
      const locationHaystack = [event.city, event.venue, event.address].join(" ").toLowerCase()
      if (!locationHaystack.includes(location)) return false
    }

    return true
  })
}
