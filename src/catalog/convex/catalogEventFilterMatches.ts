import type { Doc } from "#convex/_generated/dataModel.js"
import type { EventFilter } from "#src/events/EventFilter.ts"
import { eventTimeWindowMatches } from "#src/events/eventTimeWindowMatches.ts"

export function catalogEventFilterMatches(event: Doc<"catalogEvents">, filter: EventFilter, now: Date): boolean {
  const query = filter.query.trim().toLowerCase()
  const location = filter.location.trim().toLowerCase()

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
}
