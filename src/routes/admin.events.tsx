import { createFileRoute } from "@tanstack/solid-router"
import { AdminEventsListPage } from "../admin/AdminEventsListPage.tsx"
import { adminEventsListRouteStateCreate } from "../admin/adminEventsListRouteStateCreate.ts"
import { adminEventsSearchParse } from "../admin/adminEventsSearchParse.ts"

export const Route = createFileRoute("/admin/events")({
  validateSearch: adminEventsSearchParse,
  component: AdminEventsRoute,
})

function AdminEventsRoute() {
  const state = adminEventsListRouteStateCreate()

  return <AdminEventsListPage state={state} />
}
