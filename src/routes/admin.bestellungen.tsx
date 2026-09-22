import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { AdminTicketOrdersPage } from "../admin/AdminTicketOrdersPage.tsx"
import { adminTicketOrdersPageStateCreate } from "../admin/adminTicketOrdersPageStateCreate.ts"
import { adminTicketOrdersGet } from "../server/adminTicketOrdersGet.ts"

const getAdminTicketOrders = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof adminTicketOrdersGet>[0]) => input)
  .handler(({ data }) => adminTicketOrdersGet(data))

export const Route = createFileRoute("/admin/bestellungen")({
  component: AdminTicketOrdersRoute,
})

function AdminTicketOrdersRoute() {
  const state = adminTicketOrdersPageStateCreate({ list: (input) => getAdminTicketOrders({ data: input }) })
  return <AdminTicketOrdersPage state={state} />
}
