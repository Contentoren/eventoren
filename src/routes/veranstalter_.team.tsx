import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { veranstalterDashboardPageStateCreate } from "#src/organizer/dashboard/client/veranstalterDashboardPageStateCreate.ts"
import { VeranstalterDashboardTeamPage } from "#src/organizer/dashboard/pages/team/VeranstalterDashboardTeamPage.tsx"
import {
  type OrganizerDashboardTeamDialog,
  organizerDashboardTeamStateCreate,
} from "#src/organizer/dashboard/pages/team/veranstalterDashboardTeamStateCreate.ts"
import { organizerDashboardTeamSearchParse } from "#src/organizer/dashboard/pages/team/veranstalterDashboardTeamSearchParse.ts"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardPageFrame } from "#src/organizer/dashboard/ui/VeranstalterDashboardPageFrame.tsx"

export const Route = createFileRoute("/veranstalter_/team")({
  validateSearch: (input: unknown) => organizerDashboardTeamSearchParse(input),
  head: () => ({
    meta: [{ title: "Team | Eventoren" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardTeamRoute />
    </ClientOnly>
  ),
})

function VeranstalterDashboardTeamRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => search().org,
    selectOrganization: (organizationId) =>
      void navigate({ to: "/veranstalter/team", search: { ...search(), org: organizationId }, replace: true }),
  })
  const team = organizerDashboardTeamStateCreate({
    orgId: page.orgId,
    canManage: () => page.shell.activeOrganization()?.permissions.includes("team.verwalten") ?? false,
    dialog: () => search().dialog,
    memberId: () => search().mitglied,
    openDialog: (dialog: OrganizerDashboardTeamDialog, memberId?: string) =>
      void navigate({ to: "/veranstalter/team", search: { ...search(), dialog, mitglied: memberId } }),
    closeDialog: () =>
      void navigate({
        to: "/veranstalter/team",
        search: { ...search(), dialog: undefined, mitglied: undefined },
        replace: true,
      }),
  })
  return (
    <VeranstalterDashboardPageFrame state={page.shell}>
      <VeranstalterDashboardTeamPage state={team} />
    </VeranstalterDashboardPageFrame>
  )
}
