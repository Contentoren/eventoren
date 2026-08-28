import type { EventFilter } from "./EventFilter.ts"

export type EventDiscoverySearch = {
  q?: string
  kategorie?: EventFilter["category"]
  zeitraum?: EventFilter["timeWindow"]
}
