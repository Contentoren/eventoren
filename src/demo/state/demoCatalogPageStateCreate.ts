import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { EventFilter } from "../../events/EventFilter.ts"
import type { EventItem } from "../../events/EventItem.ts"
import { eventFilterApply } from "../../events/eventFilterApply.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

const initialFilter: EventFilter = {
  query: "",
  location: "",
  category: "alle",
  timeWindow: "alle",
}

export function demoCatalogPageStateCreate(inputs: {
  events: readonly EventItem[]
  scenario?: "default" | "empty" | "error" | "booking-success"
  flow?: DemoFlowContextValue
}) {
  const scenario = inputs.scenario ?? "default"
  const flow = inputs.flow ?? demoFlowContextUse()
  const filter = createSignalObject<EventFilter>(initialFilter)
  const bookingSuccess = createSignalObject(scenario === "booking-success")

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : false)
  const isError = () => (hasFlow() ? flow.isError() : scenario === "error")
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : scenario === "empty")

  const visibleEvents = () => {
    if (isLoading() || isError() || isEmpty()) return []
    return eventFilterApply(inputs.events, filter.get())
  }

  const error = () => {
    if (isError()) return "Der Eventkatalog ist gerade nicht verfügbar. Bitte versuche es später erneut."
    return ""
  }

  const retry = () => {
    flow.setState("loaded")
  }

  return {
    filter: filter.get,
    visibleEvents,
    resultCount: () => visibleEvents().length,
    isLoading,
    isBookingSuccess: bookingSuccess.get,
    dismissBookingSuccess: () => bookingSuccess.set(false),
    applyFilter: (next: EventFilter) => filter.set(next),
    error,
    retry,
  }
}
