import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { VeranstalterDashboardLoadingState } from "#src/organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardGutscheinePage } from "#src/organizer/dashboard/pages/pricing/VeranstalterDashboardGutscheinePage.tsx"
import { veranstalterDashboardGutscheineSearchParse } from "#src/organizer/dashboard/pages/pricing/veranstalterDashboardGutscheineSearchParse.ts"

export const Route = createFileRoute("/veranstalter_/gutscheine")({
  validateSearch: veranstalterDashboardGutscheineSearchParse,
  component: GutscheineRoute,
})
function GutscheineRoute() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardGutscheinePage
        search={search}
        changeSearch={(next) => void navigate({ search: next, replace: true })}
      />
    </ClientOnly>
  )
}
