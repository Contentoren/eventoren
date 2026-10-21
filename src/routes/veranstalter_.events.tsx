import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { useContext } from "solid-js"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { veranstalterDashboardPageStateCreate } from "#src/organizer/dashboard/client/veranstalterDashboardPageStateCreate.ts"
import { VeranstalterDashboardPageFrame } from "#src/organizer/dashboard/ui/VeranstalterDashboardPageFrame.tsx"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { veranstalterDashboardEventsListStateCreate } from "#src/organizer/dashboard/pages/events/veranstalterDashboardEventsListStateCreate.ts"
import { VeranstalterDashboardEventsListPage } from "#src/organizer/dashboard/pages/events/VeranstalterDashboardEventsListPage.tsx"
import { veranstalterDashboardEventsSearchParse } from "#src/organizer/dashboard/pages/events/veranstalterDashboardEventsSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/events")({
  validateSearch: (input: unknown) => veranstalterDashboardEventsSearchParse(input),
  component: () => (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardEventsRoute />
    </ClientOnly>
  ),
})

function VeranstalterDashboardEventsRoute() {
  const auth = useContext(eventorenAuthContext)
  const search = Route.useSearch()
  const navigate = useNavigate()
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => search().org,
    selectOrganization: (organizationId) =>
      void navigate({ to: "/veranstalter/events", search: { ...search(), org: organizationId }, replace: true }),
  })
  const list = veranstalterDashboardEventsListStateCreate({
    orgId: page.orgId,
    tab: () => search().filter,
    query: () => search().q ?? "",
    canCreate: () => page.shell.activeOrganization()?.permissions.includes("events.bearbeiten") ?? false,
    createNew: () =>
      void navigate({
        to: "/veranstalter/events/neu",
        search: search().org ? { org: search().org } : {},
      }),
  })
  return (
    <VeranstalterDashboardPageFrame state={page.shell}>
      <VeranstalterDashboardEventsListPage
        state={list}
        orgParam={search().org}
        queryChange={(query) =>
          void navigate({ to: "/veranstalter/events", search: { ...search(), q: query || undefined }, replace: true })
        }
      />
    </VeranstalterDashboardPageFrame>
  )
}
