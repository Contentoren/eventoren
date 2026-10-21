import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardGaestelistePage } from "#src/organizer/dashboard/pages/guests/VeranstalterDashboardGaestelistePage.tsx"
import { veranstalterDashboardGaestelisteSearchParse } from "#src/organizer/dashboard/pages/guests/veranstalterDashboardGaestelisteSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/events_/$eventKey_/gaesteliste")({
  validateSearch: veranstalterDashboardGaestelisteSearchParse,
  component: EventGaestelisteRoute,
})
function EventGaestelisteRoute() {
  const search = Route.useSearch(),
    params = Route.useParams(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardGaestelistePage
        search={search}
        changeSearch={(search) => void navigate({ search, replace: true })}
        eventKey={() => params().eventKey}
      />
    </ClientOnly>
  )
}
