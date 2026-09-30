import { getRouteApi, useRouter } from "@tanstack/solid-router"
import { adminEventNewCatalogStateCreate } from "./adminEventNewCatalogStateCreate.ts"
import { adminEventsRouteStateCreate } from "./adminEventsRouteStateCreate.ts"
import { adminTicketProductsFormStateCreate } from "./adminTicketProductsFormStateCreate.ts"

const route = getRouteApi("/admin/events_/new")

export function adminEventNewRouteStateCreate() {
  const originalCatalog = adminEventsRouteStateCreate()
  const search = route.useSearch()
  const router = useRouter()
  const navigate = route.useNavigate()
  const tab = (): "details" | "products" => (search().tab === "products" ? "products" : "details")
  const onSaved = async (eventKey: string) => {
    await router.invalidate({ filter: (match) => match.routeId === "/admin", sync: true })
    await navigate({
      to: "/admin/events/$eventKey",
      params: { eventKey },
      search: tab() === "products" ? { tab: "products" } : {},
      replace: true,
    })
  }
  originalCatalog.startNewEvent()
  const catalog = adminEventNewCatalogStateCreate(originalCatalog, onSaved)
  return {
    catalog,
    ticketForm: adminTicketProductsFormStateCreate(catalog),
    tab,
    onSaved,
  }
}
