import type { EventFilter } from "./EventFilter.ts"

export type EventHeroTab = {
  id: string
  label: string
  category: EventFilter["category"]
}
