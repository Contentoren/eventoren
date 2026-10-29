import { getRouteApi } from "@tanstack/solid-router"
import { createEffect } from "solid-js"
import type { AdminEventDetailTab } from "./adminEventDetailSearchParse.ts"
import { adminEventsRouteStateCreate } from "./adminEventsRouteStateCreate.ts"

const route = getRouteApi("/admin/events_/$eventKey")

export function adminEventDetailRouteStateCreate() {
  const params = route.useParams()
  const catalog = adminEventsRouteStateCreate(() => ({ eventKey: params().eventKey }))
  const search = route.useSearch()
  const event = () => catalog.events().find((candidate) => candidate.id === params().eventKey)
  createEffect(() => {
    const found = event()
    if (found && catalog.selectedEventKey() !== found.id) catalog.selectEvent(found)
  })
  // Pagination may still fetch further pages while the current prefix has no
  // match: resolve first, confirm missing only once exhausted without an error.
  const moreAvailable = () => catalog.isAuthorized() && !(catalog.isDone?.() ?? true)
  const isLoading = () => catalog.isLoading?.() ?? false
  const loadError = () => catalog.eventsError?.() ?? ""
  return {
    catalog,
    event,
    eventKey: () => params().eventKey,
    tab: (): AdminEventDetailTab => search().tab ?? "details",
    isResolving: () => isLoading() || (!event() && moreAvailable()),
    notFound: () => !isLoading() && !event() && !moreAvailable() && !loadError(),
    loadError,
  }
}
