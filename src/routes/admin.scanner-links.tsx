import { createFileRoute, getRouteApi } from "@tanstack/solid-router"
import { AdminScannerLinksPage } from "../admin/AdminScannerLinksPage.tsx"

const adminRoute = getRouteApi("/admin")

export const Route = createFileRoute("/admin/scanner-links")({
  component: AdminScannerLinksRoute,
})

function AdminScannerLinksRoute() {
  const data = adminRoute.useLoaderData()
  return <AdminScannerLinksPage eventsResult={() => data().eventsResult} />
}
