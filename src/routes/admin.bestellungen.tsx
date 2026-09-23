import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { AdminTicketOrdersPage } from "../admin/AdminTicketOrdersPage.tsx"
import { adminTicketOrdersPageStateCreate } from "../admin/adminTicketOrdersPageStateCreate.ts"
import { adminTicketOrdersSearchParse } from "../admin/adminTicketOrdersSearchParse.ts"
import { adminTicketOrdersGet } from "../server/adminTicketOrdersGet.ts"
import { adminTicketOrderGet } from "../server/adminTicketOrderGet.ts"

const getAdminTicketOrders = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof adminTicketOrdersGet>[0]) => input)
  .handler(({ data }) => adminTicketOrdersGet(data))

const getAdminTicketOrder = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof adminTicketOrderGet>[0]) => input)
  .handler(({ data }) => adminTicketOrderGet(data))
const adminRoute = getRouteApi("/admin")

export const Route = createFileRoute("/admin/bestellungen")({
  validateSearch: adminTicketOrdersSearchParse,
  component: AdminTicketOrdersRoute,
})

function AdminTicketOrdersRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const adminData = adminRoute.useLoaderData()
  const state = adminTicketOrdersPageStateCreate({
    list: (input) => getAdminTicketOrders({ data: input }),
    getDetails: (input) => getAdminTicketOrder({ data: input }),
    events: () => {
      const data = adminData()
      return data.authorized && data.eventsResult.success ? data.eventsResult.data : []
    },
    eventSignal: {
      get: () => search().event ?? "",
      set: (event) =>
        void navigate({ to: "/admin/bestellungen", search: { event: event || undefined }, replace: true }),
    },
  })
  return <AdminTicketOrdersPage state={state} />
}
