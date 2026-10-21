import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardFinanzenPage } from "#src/organizer/dashboard/pages/finance/VeranstalterDashboardFinanzenPage.tsx"
import { veranstalterDashboardFinanzenSearchParse } from "#src/organizer/dashboard/pages/finance/veranstalterDashboardFinanzenSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/finanzen")({
  validateSearch: veranstalterDashboardFinanzenSearchParse,
  component: FinanzenRoute,
})
function FinanzenRoute() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardFinanzenPage
        search={search}
        changeSearch={(next) => void navigate({ search: next, replace: true })}
      />
    </ClientOnly>
  )
}
