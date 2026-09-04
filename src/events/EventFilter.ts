import type { EventCategory } from "./EventCategory.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"

export type EventFilter = {
  query: string
  location: string
  category: EventCategory | "alle"
  timeWindow: EventTimeWindow
}
