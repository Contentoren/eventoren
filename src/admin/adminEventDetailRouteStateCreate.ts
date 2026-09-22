import { getRouteApi } from "@tanstack/solid-router"
import { adminEventsRouteStateCreate } from "./adminEventsRouteStateCreate.ts"

const route = getRouteApi("/admin/events_/$eventKey")

export function adminEventDetailRouteStateCreate() {
  const catalog = adminEventsRouteStateCreate()
  const params = route.useParams()
  const search = route.useSearch()
  const event = catalog.events().find((candidate) => candidate.id === params().eventKey)
  if (event) catalog.selectEvent(event)
  return {
    catalog,
    event: () => catalog.events().find((candidate) => candidate.id === params().eventKey),
    eventKey: () => params().eventKey,
    tab: (): "details" | "products" => (search().tab === "products" ? "products" : "details"),
  }
}
