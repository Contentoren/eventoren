import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { veranstalterDashboardPageStateCreate } from "../organizer/dashboard/client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardSearchParse } from "../organizer/dashboard/client/veranstalterDashboardSearchParse.ts"
import { VeranstalterDashboardLoadingState } from "../organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardPageFrame } from "../organizer/dashboard/ui/VeranstalterDashboardPageFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { VeranstalterOnboardingPage } from "../organizer/dashboard/pages/organization/ui/VeranstalterOnboardingPage.tsx"

export const Route = createFileRoute("/veranstalter_/onboarding")({
  validateSearch: (input: unknown) => veranstalterDashboardSearchParse(input),
  head: () => ({
    ...seoHeadCreate("/veranstalter/onboarding"),
    meta: [...seoHeadCreate("/veranstalter/onboarding").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <VeranstalterOnboardingRoute />
    </ClientOnly>
  ),
})

function VeranstalterOnboardingRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => search().org,
    selectOrganization: (organizationId) =>
      void navigate({ to: "/veranstalter/onboarding", search: { org: organizationId }, replace: true }),
  })
  return (
    <VeranstalterDashboardPageFrame state={page.shell} organizationOptional>
      <VeranstalterOnboardingPage />
    </VeranstalterDashboardPageFrame>
  )
}
