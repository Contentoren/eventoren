import type { EventCategory } from "./EventCategory.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"

/** A one-tap shortcut below the hero filter bar. */
export type EventHeroQuickChip = {
  id: string
  label: string
  category: EventCategory | "alle"
  timeWindow: EventTimeWindow
}
