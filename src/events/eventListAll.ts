import type { EventItem } from "./EventItem.ts"
import { eventListMock } from "./eventListMock.ts"

export function eventListAll(): readonly EventItem[] {
  return [...eventListMock].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
}
