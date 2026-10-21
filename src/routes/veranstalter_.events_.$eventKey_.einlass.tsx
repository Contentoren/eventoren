import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardEinlassPage } from "#src/organizer/dashboard/pages/admission/VeranstalterDashboardEinlassPage.tsx"
import { veranstalterDashboardEinlassSearchParse } from "#src/organizer/dashboard/pages/admission/veranstalterDashboardEinlassSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/events_/$eventKey_/einlass")({
  validateSearch: veranstalterDashboardEinlassSearchParse,
  component: EventAdmissionRoute,
})
function EventAdmissionRoute() {
  const search = Route.useSearch(),
    params = Route.useParams(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardEinlassPage
        search={search}
        changeSearch={(search) => void navigate({ search, replace: true })}
        eventKey={() => params().eventKey}
      />
    </ClientOnly>
  )
}
