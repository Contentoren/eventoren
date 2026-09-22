import { createFileRoute } from "@tanstack/solid-router"
import { AdminEventDetailPage } from "../admin/AdminEventDetailPage.tsx"
import { adminEventDetailRouteStateCreate } from "../admin/adminEventDetailRouteStateCreate.ts"
import { adminEventDetailSearchParse } from "../admin/adminEventDetailSearchParse.ts"

export const Route = createFileRoute("/admin/events_/$eventKey")({
  validateSearch: adminEventDetailSearchParse,
  component: AdminEventDetailRoute,
})

function AdminEventDetailRoute() {
  const state = adminEventDetailRouteStateCreate()
  return <AdminEventDetailPage state={state} />
}
