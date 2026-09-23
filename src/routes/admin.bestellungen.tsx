import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { AdminTicketOrdersPage } from "../admin/AdminTicketOrdersPage.tsx"
import { adminTicketOrdersPageStateCreate } from "../admin/adminTicketOrdersPageStateCreate.ts"
import { adminTicketOrdersGet } from "../server/adminTicketOrdersGet.ts"
import { adminTicketOrderGet } from "../server/adminTicketOrderGet.ts"

const getAdminTicketOrders = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof adminTicketOrdersGet>[0]) => input)
  .handler(({ data }) => adminTicketOrdersGet(data))

const getAdminTicketOrder = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof adminTicketOrderGet>[0]) => input)
  .handler(({ data }) => adminTicketOrderGet(data))

export const Route = createFileRoute("/admin/bestellungen")({
  component: AdminTicketOrdersRoute,
})

function AdminTicketOrdersRoute() {
  const state = adminTicketOrdersPageStateCreate({
    list: (input) => getAdminTicketOrders({ data: input }),
    getDetails: (input) => getAdminTicketOrder({ data: input }),
  })
  return <AdminTicketOrdersPage state={state} />
}
