import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardPreisePage } from "#src/organizer/dashboard/pages/pricing/VeranstalterDashboardPreisePage.tsx"
import { veranstalterDashboardPreiseSearchParse } from "#src/organizer/dashboard/pages/pricing/veranstalterDashboardPreiseSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/events_/$eventKey_/preise")({
  validateSearch: veranstalterDashboardPreiseSearchParse,
  component: PreiseRoute,
})
function PreiseRoute() {
  const search = Route.useSearch(),
    params = Route.useParams(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardPreisePage
        search={search}
        changeSearch={(next) => void navigate({ search: next, replace: true })}
        eventKey={() => params().eventKey}
      />
    </ClientOnly>
  )
}
