import { getRouteApi } from "@tanstack/solid-router"
import { createEffect } from "solid-js"
import { adminEventsRouteStateCreate } from "./adminEventsRouteStateCreate.ts"

const route = getRouteApi("/admin/events_/$eventKey")

export function adminEventDetailRouteStateCreate() {
  const catalog = adminEventsRouteStateCreate()
  const params = route.useParams()
  const search = route.useSearch()
  createEffect(() => {
    const event = catalog.events().find((candidate) => candidate.id === params().eventKey)
    if (event && catalog.selectedEventKey() !== event.id) catalog.selectEvent(event)
  })
  return {
    catalog,
    event: () => catalog.events().find((candidate) => candidate.id === params().eventKey),
    eventKey: () => params().eventKey,
    tab: (): "details" | "products" => (search().tab === "products" ? "products" : "details"),
  }
}
