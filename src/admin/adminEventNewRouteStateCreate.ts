import { getRouteApi } from "@tanstack/solid-router"
import { adminEventNewCatalogStateCreate } from "./adminEventNewCatalogStateCreate.ts"
import { adminEventsRouteStateCreate } from "./adminEventsRouteStateCreate.ts"
import { adminTicketProductsFormStateCreate } from "./adminTicketProductsFormStateCreate.ts"

const route = getRouteApi("/admin/events_/new")

export function adminEventNewRouteStateCreate() {
  const originalCatalog = adminEventsRouteStateCreate()
  const search = route.useSearch()
  originalCatalog.startNewEvent()
  const catalog = adminEventNewCatalogStateCreate(originalCatalog)
  return {
    catalog,
    ticketForm: adminTicketProductsFormStateCreate(catalog),
    tab: (): "details" | "products" => (search().tab === "products" ? "products" : "details"),
  }
}
