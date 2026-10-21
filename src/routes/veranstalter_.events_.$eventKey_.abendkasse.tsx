import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardAbendkassePage } from "#src/organizer/dashboard/pages/boxoffice/VeranstalterDashboardAbendkassePage.tsx"
import { veranstalterDashboardAbendkasseSearchParse } from "#src/organizer/dashboard/pages/boxoffice/veranstalterDashboardAbendkasseSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/events_/$eventKey_/abendkasse")({
  validateSearch: veranstalterDashboardAbendkasseSearchParse,
  component: EventBoxOfficeRoute,
})
function EventBoxOfficeRoute() {
  const search = Route.useSearch(),
    params = Route.useParams(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardAbendkassePage
        search={search}
        changeSearch={(search) => void navigate({ search, replace: true })}
        eventKey={() => params().eventKey}
      />
    </ClientOnly>
  )
}
