import type { EventCategory } from "./EventCategory.ts"
import type { EventDiscoverySearch } from "./EventDiscoverySearch.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"
import { eventCategoryLabels } from "./eventCategoryLabels.ts"
import { eventTimeWindowLabels } from "./eventTimeWindowLabels.ts"

export function eventDiscoverySearchParse(input: Record<string, unknown>): EventDiscoverySearch {
  const rawQuery = input.q
  const rawCategory = input.kategorie
  const rawTimeWindow = input.zeitraum

  const isCategory = typeof rawCategory === "string" && rawCategory in eventCategoryLabels
  const isTimeWindow =
    typeof rawTimeWindow === "string" && rawTimeWindow !== "alle" && rawTimeWindow in eventTimeWindowLabels

  return {
    q: typeof rawQuery === "string" && rawQuery.length > 0 ? rawQuery : undefined,
    kategorie: isCategory ? (rawCategory as EventCategory) : undefined,
    zeitraum: isTimeWindow ? (rawTimeWindow as EventTimeWindow) : undefined,
  }
}
