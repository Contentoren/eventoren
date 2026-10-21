import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardNachrichtenPage } from "#src/organizer/dashboard/pages/messages/VeranstalterDashboardNachrichtenPage.tsx"
import { veranstalterDashboardNachrichtenSearchParse } from "#src/organizer/dashboard/pages/messages/veranstalterDashboardNachrichtenSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/events_/$eventKey_/nachrichten")({
  validateSearch: veranstalterDashboardNachrichtenSearchParse,
  component: EventNachrichtenRoute,
})
function EventNachrichtenRoute() {
  const search = Route.useSearch(),
    params = Route.useParams(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardNachrichtenPage
        search={search}
        changeSearch={(search) => void navigate({ search, replace: true })}
        eventKey={() => params().eventKey}
      />
    </ClientOnly>
  )
}
