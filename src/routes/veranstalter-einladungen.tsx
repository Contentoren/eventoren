import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardInvitationsPage } from "#src/organizer/dashboard/pages/team/VeranstalterDashboardInvitationsPage.tsx"
import { organizerDashboardInvitationsSearchParse } from "#src/organizer/dashboard/pages/team/veranstalterDashboardInvitationsSearchParse.ts"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"

export const Route = createFileRoute("/veranstalter-einladungen")({
  validateSearch: (input: unknown) => organizerDashboardInvitationsSearchParse(input),
  head: () => ({
    meta: [{ title: "Deine Einladungen | Eventoren" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardInvitationsRoute />
    </ClientOnly>
  ),
})

function VeranstalterDashboardInvitationsRoute() {
  const search = Route.useSearch()
  return <VeranstalterDashboardInvitationsPage selectedInvitationId={() => search().einladung} />
}
