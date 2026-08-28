import { getRouteApi } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import type { EventFilter } from "./EventFilter.ts"
import { eventFilterApply } from "./eventFilterApply.ts"
import { eventListAll } from "./eventListAll.ts"

const routeApi = getRouteApi("/")

export function indexPageStateCreate() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const allEvents = createMemo(() => eventListAll())

  const filter = createMemo<EventFilter>(() => ({
    query: search().q ?? "",
    category: search().kategorie ?? "alle",
    timeWindow: search().zeitraum ?? "alle",
  }))

  const visibleEvents = createMemo(() => eventFilterApply(allEvents(), filter()))

  const applyFilter = (next: EventFilter) => {
    navigate({
      to: "/",
      search: {
        q: next.query.length > 0 ? next.query : undefined,
        kategorie: next.category === "alle" ? undefined : next.category,
        zeitraum: next.timeWindow === "alle" ? undefined : next.timeWindow,
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
    applyFilter,
  }
}
