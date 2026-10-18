import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoAdminNav } from "../../demo/ui/DemoAdminNav.tsx"
import { DashAdminOrgDetail } from "../../dash/admin/orgs/DashAdminOrgDetail.tsx"

export const Route = createFileRoute("/demo/admin_/organisationen_/$orgId")({
  head: () =>
    demoRouteHeadCreate(
      "Organisation-Detail-Demo",
      "Lokale Admin-Detailansicht einer Veranstalterorganisation.",
      "/demo/admin/organisationen/org-lindenhof",
    ),
  component: AdminOrgDetailRoute,
})

function AdminOrgDetailRoute() {
  const params = Route.useParams()

  return (
    <div class="space-y-4">
      <DemoAdminNav />
      <ClientOnly
        fallback={
          <div class="flex flex-col gap-4" aria-label="Organisation laden">
            <Skeleton class="h-28 w-full rounded-card" />
            <div class="grid gap-4 lg:grid-cols-2">
              <Skeleton class="h-64 w-full rounded-card" />
              <Skeleton class="h-64 w-full rounded-card" />
            </div>
          </div>
        }
      >
        <DashAdminOrgDetail orgId={() => params().orgId} />
      </ClientOnly>
    </div>
  )
}
