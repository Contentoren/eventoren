import type { EventFilter } from "./EventFilter.ts"

export function eventFilterEmpty(): EventFilter {
  return { query: "", category: "alle", timeWindow: "alle" }
}
