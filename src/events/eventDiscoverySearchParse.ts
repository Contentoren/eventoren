import type { EventCategory } from "./EventCategory.ts"
import type { EventDiscoverySearch } from "./EventDiscoverySearch.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"
import { eventCategoryLabels } from "./eventCategoryLabels.ts"
import { eventTimeWindowLabels } from "./eventTimeWindowLabels.ts"

export function eventDiscoverySearchParse(input: Record<string, unknown>): EventDiscoverySearch {
  const rawQuery = input.q
  const rawLocation = input.ort ?? input.location
  const rawCategory = input.kategorie
  const rawTimeWindow = input.zeitraum
  const rawBooking = input.buchung ?? input.booking

  const isCategory = typeof rawCategory === "string" && rawCategory in eventCategoryLabels
  const isTimeWindow =
    typeof rawTimeWindow === "string" && rawTimeWindow !== "alle" && rawTimeWindow in eventTimeWindowLabels
  const isBookingSuccess = rawBooking === "erfolgreich" || rawBooking === "success"

  return {
    q: typeof rawQuery === "string" && rawQuery.length > 0 ? rawQuery : undefined,
    ort: typeof rawLocation === "string" && rawLocation.length > 0 ? rawLocation : undefined,
    kategorie: isCategory ? (rawCategory as EventCategory) : undefined,
    zeitraum: isTimeWindow ? (rawTimeWindow as EventTimeWindow) : undefined,
    buchung: isBookingSuccess ? "erfolgreich" : undefined,
  }
}
