import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerEventGroup } from "./OrganizerEventGroup.ts"

export function organizerEventsGroup(events: readonly OrganizerEvent[]): readonly OrganizerEventGroup[] {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  })
  const keyFormatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Berlin",
  })
  const groups = new Map<string, OrganizerEventGroup>()
  for (const event of [...events].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))) {
    const date = new Date(event.startsAt)
    const parts = Number.isNaN(date.valueOf()) ? [] : keyFormatter.formatToParts(date)
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value
    const key = Number.isNaN(date.valueOf())
      ? event.startsAt
      : `${part("year")}-${Number(part("month")) - 1}-${Number(part("day"))}`
    const current = groups.get(key)
    if (current) {
      groups.set(key, { ...current, events: [...current.events, event] })
      continue
    }
    groups.set(key, {
      key,
      heading: Number.isNaN(date.valueOf()) ? event.startsAt : formatter.format(date),
      events: [event],
    })
  }
  return [...groups.values()]
}
