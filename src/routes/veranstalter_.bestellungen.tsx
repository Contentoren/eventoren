import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardOrdersPage } from "#src/organizer/dashboard/pages/orders/VeranstalterDashboardOrdersPage.tsx"
import { veranstalterDashboardOrdersSearchParse } from "#src/organizer/dashboard/pages/orders/veranstalterDashboardOrdersSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/bestellungen")({
  validateSearch: veranstalterDashboardOrdersSearchParse,
  component: OrdersRoute,
})
function OrdersRoute() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardOrdersPage
        search={search}
        changeSearch={(search) => void navigate({ search, replace: true })}
        eventKey={() => undefined}
        participants={false}
      />
    </ClientOnly>
  )
}
