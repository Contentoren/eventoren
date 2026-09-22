import { createFileRoute } from "@tanstack/solid-router"
import { AdminEventNewPage } from "../admin/AdminEventNewPage.tsx"
import { adminEventNewRouteStateCreate } from "../admin/adminEventNewRouteStateCreate.ts"

export const Route = createFileRoute("/admin/events_/new")({ component: AdminEventNewRoute })

function AdminEventNewRoute() {
  const state = adminEventNewRouteStateCreate()
  return <AdminEventNewPage state={state} />
}
