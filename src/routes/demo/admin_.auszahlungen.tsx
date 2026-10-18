import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoAdminNav } from "../../demo/ui/DemoAdminNav.tsx"
import { DashAdminPayoutsPage } from "../../dash/admin/payouts/DashAdminPayoutsPage.tsx"
import {
  dashAdminPayoutsSearchParse,
  type DashAdminPayoutsSearch,
} from "../../dash/admin/payouts/dashAdminPayoutsStateCreate.ts"

export const Route = createFileRoute("/demo/admin_/auszahlungen")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = dashAdminPayoutsSearchParse(raw)
    const output: Record<string, unknown> = {}
    if (parsed.status !== "bereit") output["status"] = parsed.status
    if (parsed.auszahlung !== "") output["auszahlung"] = parsed.auszahlung
    return output
  },
  head: () =>
    demoRouteHeadCreate(
      "Auszahlungen-Demo",
      "Lokale Admin-Übersicht aller Auszahlungen an Veranstalter.",
      "/demo/admin/auszahlungen",
    ),
  component: AdminPayoutsRoute,
})

function AdminPayoutsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()

  const parsed = (): DashAdminPayoutsSearch => dashAdminPayoutsSearchParse(search() as Record<string, unknown>)

  const patch = (delta: Partial<DashAdminPayoutsSearch>) => {
    const current = { ...parsed(), ...delta }
    const next: Record<string, string> = {}
    if (current.status !== "bereit") next["status"] = current.status
    if (current.auszahlung !== "") next["auszahlung"] = current.auszahlung
    void navigate({ to: "/demo/admin/auszahlungen", search: next, replace: true })
  }

  return (
    <div class="space-y-4">
      <DemoAdminNav />
      <ClientOnly
        fallback={
          <div class="flex flex-col gap-3" aria-label="Auszahlungen laden">
            <Skeleton class="h-9 w-64 rounded-control" />
            <Skeleton class="h-8 w-96 rounded-full" />
            <Skeleton class="h-64 w-full rounded-card" />
          </div>
        }
      >
        <DashAdminPayoutsPage search={parsed} onPatch={patch} />
      </ClientOnly>
    </div>
  )
}
