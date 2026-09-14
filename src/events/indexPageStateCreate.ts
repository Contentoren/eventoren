import { getRouteApi } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import type { EventFilter } from "./EventFilter.ts"
import { eventFilterApply } from "./eventFilterApply.ts"
import type { EventItem } from "./EventItem.ts"

const routeApi = getRouteApi("/")

export function indexPageStateCreate(inputs: { events: () => readonly EventItem[] }) {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const allEvents = createMemo(() =>
    [...inputs.events()].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
  )

  const filter = createMemo<EventFilter>(() => ({
    query: search().q ?? "",
    location: search().ort ?? "",
    category: search().kategorie ?? "alle",
    timeWindow: search().zeitraum ?? "alle",
  }))

  const visibleEvents = createMemo(() => eventFilterApply(allEvents(), filter()))
  const isBookingSuccess = createMemo(() => search().buchung === "erfolgreich")

  const applyFilter = (next: EventFilter) => {
    navigate({
      to: "/",
      search: {
        q: next.query.length > 0 ? next.query : undefined,
        ort: next.location.length > 0 ? next.location : undefined,
        kategorie: next.category === "alle" ? undefined : next.category,
        zeitraum: next.timeWindow === "alle" ? undefined : next.timeWindow,
        buchung: search().buchung,
      },
      replace: true,
      resetScroll: false,
    })
  }

  const dismissBookingSuccess = () => {
    navigate({
      to: "/",
      search: {
        q: search().q,
        ort: search().ort,
        kategorie: search().kategorie,
        zeitraum: search().zeitraum,
        buchung: undefined,
      },
      replace: true,
      resetScroll: false,
    })
  }

  return {
    filter,
    visibleEvents,
    totalCount: () => allEvents().length,
    resultCount: () => visibleEvents().length,
    isBookingSuccess,
    dismissBookingSuccess,
    applyFilter,
  }
}
