import type { EventFilter } from "./EventFilter.ts"

export function eventFilterEmpty(): EventFilter {
  return { query: "", location: "", category: "alle", timeWindow: "alle" }
}
