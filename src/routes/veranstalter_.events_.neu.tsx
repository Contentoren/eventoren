import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { useContext } from "solid-js"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { veranstalterDashboardPageStateCreate } from "#src/organizer/dashboard/client/veranstalterDashboardPageStateCreate.ts"
import { VeranstalterDashboardPageFrame } from "#src/organizer/dashboard/ui/VeranstalterDashboardPageFrame.tsx"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { veranstalterDashboardEventCreateStateCreate } from "#src/organizer/dashboard/pages/events/veranstalterDashboardEventCreateStateCreate.ts"
import { VeranstalterDashboardEventCreatePage } from "#src/organizer/dashboard/pages/events/VeranstalterDashboardEventCreatePage.tsx"
import { veranstalterDashboardEventCreateSearchParse } from "#src/organizer/dashboard/pages/events/veranstalterDashboardEventCreateSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/events_/neu")({
  validateSearch: (input: unknown) => veranstalterDashboardEventCreateSearchParse(input),
  component: () => (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardEventCreateRoute />
    </ClientOnly>
  ),
})

function VeranstalterDashboardEventCreateRoute() {
  const auth = useContext(eventorenAuthContext)
  const search = Route.useSearch()
  const navigate = useNavigate()
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => search().org,
    selectOrganization: (organizationId) =>
      void navigate({ to: "/veranstalter/events/neu", search: { org: organizationId }, replace: true }),
  })
  const withOrg = () => (search().org ? { org: search().org } : {})
  const create = veranstalterDashboardEventCreateStateCreate({
    orgId: page.orgId,
    orgActive: () => page.shell.activeOrganization()?.status === "aktiv",
    canEdit: () => page.shell.activeOrganization()?.permissions.includes("events.bearbeiten") ?? false,
    step: () => search().step,
    draftKey: () => search().entwurf,
    savedTierKey: () => search().tier,
    toWizard: (next) =>
      void navigate({
        to: "/veranstalter/events/neu",
        search: {
          ...withOrg(),
          ...(next.step === 0 ? {} : { step: next.step }),
          entwurf: next.entwurf,
          tier: next.tier,
        },
        replace: true,
      }),
    toEvent: (eventKey) =>
      void navigate({ to: "/veranstalter/events/$eventKey", params: { eventKey }, search: withOrg() }),
    toList: () => void navigate({ to: "/veranstalter/events", search: withOrg() }),
  })
  return (
    <VeranstalterDashboardPageFrame state={page.shell}>
      <VeranstalterDashboardEventCreatePage state={create} />
    </VeranstalterDashboardPageFrame>
  )
}
