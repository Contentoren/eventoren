import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { EventFilter } from "../../events/EventFilter.ts"
import type { EventItem } from "../../events/EventItem.ts"
import { eventFilterApply } from "../../events/eventFilterApply.ts"

const initialFilter: EventFilter = {
  query: "",
  location: "",
  category: "alle",
  timeWindow: "alle",
}

export function demoCatalogPageStateCreate(inputs: {
  events: readonly EventItem[]
  scenario?: "default" | "empty" | "error" | "booking-success"
}) {
  const scenario = inputs.scenario ?? "default"
  const filter = createSignalObject<EventFilter>(initialFilter)
  const visibleEvents = createMemo(() => eventFilterApply(scenario === "empty" ? [] : inputs.events, filter.get()))
  const error = createSignalObject(scenario === "error" ? "Weitere Events konnten nicht geladen werden." : "")
  const bookingSuccess = createSignalObject(scenario === "booking-success")

  return {
    filter: filter.get,
    visibleEvents,
    resultCount: () => visibleEvents().length,
    isBookingSuccess: bookingSuccess.get,
    dismissBookingSuccess: () => bookingSuccess.set(false),
    applyFilter: (next: EventFilter) => filter.set(next),
    error: error.get,
  }
}
