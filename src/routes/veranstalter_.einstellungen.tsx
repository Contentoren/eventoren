import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { veranstalterDashboardPageStateCreate } from "../organizer/dashboard/client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardSearchParse } from "../organizer/dashboard/client/veranstalterDashboardSearchParse.ts"
import { VeranstalterDashboardLoadingState } from "../organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardPageFrame } from "../organizer/dashboard/ui/VeranstalterDashboardPageFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { VeranstalterEinstellungenPage } from "../organizer/dashboard/pages/organization/ui/VeranstalterEinstellungenPage.tsx"

export const Route = createFileRoute("/veranstalter_/einstellungen")({
  validateSearch: (input: unknown) => veranstalterDashboardSearchParse(input),
  head: () => ({
    ...seoHeadCreate("/veranstalter/einstellungen"),
    meta: [...seoHeadCreate("/veranstalter/einstellungen").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterEinstellungenRoute />
    </ClientOnly>
  ),
})

function VeranstalterEinstellungenRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => search().org,
    selectOrganization: (organizationId) =>
      void navigate({ to: "/veranstalter/einstellungen", search: { org: organizationId }, replace: true }),
  })
  return (
    <VeranstalterDashboardPageFrame state={page.shell}>
      <VeranstalterEinstellungenPage shell={page.shell} />
    </VeranstalterDashboardPageFrame>
  )
}
