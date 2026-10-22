import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { VeranstalterDashboardLoadingState } from "../organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardPublicProfilePage } from "../organizer/dashboard/public/ui/VeranstalterDashboardPublicProfilePage.tsx"
import { veranstalterDashboardPublicProfileStateCreate } from "../organizer/dashboard/public/veranstalterDashboardPublicProfileStateCreate.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

export const Route = createFileRoute("/veranstalter-p/$orgSlug")({
  head: () => seoHeadCreate("/veranstalter-p", { noindex: true }),
  component: PublicProfileRoute,
})

function PublicProfileRoute() {
  const params = Route.useParams()
  const state = veranstalterDashboardPublicProfileStateCreate({ orgSlug: () => params().orgSlug })
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <SiteFrame>
        <VeranstalterDashboardPublicProfilePage state={state} />
      </SiteFrame>
    </ClientOnly>
  )
}
