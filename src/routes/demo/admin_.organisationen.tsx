import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoAdminNav } from "../../demo/ui/DemoAdminNav.tsx"
import { DashAdminOrgsList } from "../../dash/admin/orgs/DashAdminOrgsList.tsx"
import { dashAdminOrgsSearchParse, type DashAdminOrgsSearch } from "../../dash/admin/orgs/dashAdminOrgsStateCreate.ts"
import { DashPageHeader } from "../../dash/ui/DashPageHeader.tsx"

export const Route = createFileRoute("/demo/admin_/organisationen")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = dashAdminOrgsSearchParse(raw)
    const output: Record<string, unknown> = {}
    if (parsed.status !== "alle") output["status"] = parsed.status
    if (parsed.q !== "") output["q"] = parsed.q
    return output
  },
  head: () =>
    demoRouteHeadCreate(
      "Organisationen-Demo",
      "Lokale Admin-Übersicht aller Veranstalterorganisationen.",
      "/demo/admin/organisationen",
    ),
  component: AdminOrgsRoute,
})

function AdminOrgsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()

  const parsed = (): DashAdminOrgsSearch => dashAdminOrgsSearchParse(search() as Record<string, unknown>)

  const patch = (delta: Partial<DashAdminOrgsSearch>) => {
    const current = { ...parsed(), ...delta }
    const next: Record<string, string> = {}
    if (current.status !== "alle") next["status"] = current.status
    if (current.q !== "") next["q"] = current.q
    void navigate({ to: "/demo/admin/organisationen", search: next, replace: true })
  }

  return (
    <div class="space-y-4">
      <DemoAdminNav />
      <ClientOnly
        fallback={
          <div class="flex flex-col gap-3" aria-label="Organisationen laden">
            <Skeleton class="h-9 w-64 rounded-control" />
            <Skeleton class="h-8 w-96 rounded-full" />
            <Skeleton class="h-64 w-full rounded-card" />
          </div>
        }
      >
        <div>
          <DashPageHeader
            title="Organisationen"
            description="Alle Veranstalterorganisationen mit Status, Kennzahlen und Gebührenmodell."
          />
          <DashAdminOrgsList search={parsed} onPatch={patch} />
        </div>
      </ClientOnly>
    </div>
  )
}
