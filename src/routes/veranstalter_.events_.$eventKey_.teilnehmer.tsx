import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardOrdersPage } from "#src/organizer/dashboard/pages/orders/VeranstalterDashboardOrdersPage.tsx"
import { veranstalterDashboardOrdersSearchParse } from "#src/organizer/dashboard/pages/orders/veranstalterDashboardOrdersSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/events_/$eventKey_/teilnehmer")({
  validateSearch: veranstalterDashboardOrdersSearchParse,
  component: EventParticipantsRoute,
})
function EventParticipantsRoute() {
  const search = Route.useSearch(),
    params = Route.useParams(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardOrdersPage
        search={search}
        changeSearch={(search) => void navigate({ search, replace: true })}
        eventKey={() => params().eventKey}
        participants
      />
    </ClientOnly>
  )
}
