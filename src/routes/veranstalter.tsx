import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { useContext } from "solid-js"
import { eventorenAuthContext } from "../auth/ui/eventorenAuthContext.ts"
import { veranstalterDashboardSearchParse } from "../organizer/dashboard/client/veranstalterDashboardSearchParse.ts"
import { veranstalterDashboardSourceLiveCreate } from "../organizer/dashboard/client/veranstalterDashboardSourceLiveCreate.ts"
import { VeranstalterDashboardLoadingState } from "../organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardOverviewPage } from "../organizer/dashboard/ui/VeranstalterDashboardOverviewPage.tsx"
import { veranstalterDashboardShellStateCreate } from "../organizer/dashboard/ui/veranstalterDashboardShellStateCreate.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

export const Route = createFileRoute("/veranstalter")({
  validateSearch: (input: unknown) => veranstalterDashboardSearchParse(input),
  head: () => ({
    ...seoHeadCreate("/veranstalter"),
    meta: [...seoHeadCreate("/veranstalter").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterDashboardRoute />
    </ClientOnly>
  ),
})

function VeranstalterDashboardRoute() {
  const auth = useContext(eventorenAuthContext)
  const search = Route.useSearch()
  const navigate = useNavigate()
  const source = veranstalterDashboardSourceLiveCreate({ orgId: () => search().org })
  const state = veranstalterDashboardShellStateCreate({
    source,
    authReady: () => auth.ready(),
    authenticated: () => auth.identity() !== null,
    orgId: () => search().org,
    selectOrganization: (organizationId) =>
      void navigate({ to: "/veranstalter", search: { org: organizationId }, replace: true }),
  })
  return <VeranstalterDashboardOverviewPage state={state} />
}
