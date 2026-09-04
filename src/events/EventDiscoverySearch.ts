import type { EventFilter } from "./EventFilter.ts"

export type EventDiscoverySearch = {
  q?: string
  ort?: string
  kategorie?: EventFilter["category"]
  zeitraum?: EventFilter["timeWindow"]
}
