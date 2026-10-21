import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { useContext } from "solid-js"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { veranstalterDashboardPageStateCreate } from "#src/organizer/dashboard/client/veranstalterDashboardPageStateCreate.ts"
import { VeranstalterDashboardEventDetailPage } from "#src/organizer/dashboard/pages/events/VeranstalterDashboardEventDetailPage.tsx"
import type { VeranstalterDashboardEventDetailConfirm } from "#src/organizer/dashboard/pages/events/veranstalterDashboardEventDetailSearchParse.ts"
import { veranstalterDashboardEventDetailSearchParse } from "#src/organizer/dashboard/pages/events/veranstalterDashboardEventDetailSearchParse.ts"
import { veranstalterDashboardEventDetailStateCreate } from "#src/organizer/dashboard/pages/events/veranstalterDashboardEventDetailStateCreate.ts"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardPageFrame } from "#src/organizer/dashboard/ui/VeranstalterDashboardPageFrame.tsx"

export const Route = createFileRoute("/veranstalter_/events_/$eventKey")({
  validateSearch: (input: unknown) => veranstalterDashboardEventDetailSearchParse(input),
  component: () => (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardEventDetailRoute />
    </ClientOnly>
  ),
})

function VeranstalterDashboardEventDetailRoute() {
  const auth = useContext(eventorenAuthContext)
  const search = Route.useSearch()
  const params = Route.useParams()
  const navigate = useNavigate()
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => search().org,
    selectOrganization: (organizationId) =>
      void navigate({
        to: "/veranstalter/events/$eventKey",
        params: { eventKey: params().eventKey },
        search: { ...search(), org: organizationId },
        replace: true,
      }),
  })
  const openConfirm = (confirm: VeranstalterDashboardEventDetailConfirm) =>
    void navigate({
      to: "/veranstalter/events/$eventKey",
      params: { eventKey: params().eventKey },
      search: { ...search(), bestaetigen: confirm },
      replace: true,
    })
  const detail = veranstalterDashboardEventDetailStateCreate({
    orgId: page.orgId,
    eventKey: () => params().eventKey,
    tierKey: () => search().tier,
    confirm: () => search().bestaetigen,
    canEdit: () => page.shell.activeOrganization()?.permissions.includes("events.bearbeiten") ?? false,
    canManageTiers: () => page.shell.activeOrganization()?.permissions.includes("tickets.bearbeiten") ?? false,
    canReadOrders: () => page.shell.activeOrganization()?.permissions.includes("bestellungen.sehen") ?? false,
    canReadParticipants: () =>
      (page.shell.activeOrganization()?.permissions.includes("bestellungen.sehen") ?? false) ||
      (page.shell.activeOrganization()?.permissions.includes("einlass.nutzen") ?? false),
    openTier: (tierKey) =>
      void navigate({
        to: "/veranstalter/events/$eventKey",
        params: { eventKey: params().eventKey },
        search: { ...search(), tier: tierKey },
        replace: true,
      }),
    closeTier: () =>
      void navigate({
        to: "/veranstalter/events/$eventKey",
        params: { eventKey: params().eventKey },
        search: { ...search(), tier: undefined },
        replace: true,
      }),
    openConfirm,
    closeConfirm: () =>
      void navigate({
        to: "/veranstalter/events/$eventKey",
        params: { eventKey: params().eventKey },
        search: { ...search(), bestaetigen: undefined },
        replace: true,
      }),
    toList: () =>
      void navigate({
        to: "/veranstalter/events",
        search: search().org ? { org: search().org } : {},
      }),
  })
  return (
    <VeranstalterDashboardPageFrame state={page.shell}>
      <VeranstalterDashboardEventDetailPage state={detail} orgParam={search().org} />
    </VeranstalterDashboardPageFrame>
  )
}
