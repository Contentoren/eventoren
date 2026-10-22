import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { VeranstalterDashboardLoadingState } from "../organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardPublicEventPage } from "../organizer/dashboard/public/ui/VeranstalterDashboardPublicEventPage.tsx"
import { veranstalterDashboardPublicEventStateCreate } from "../organizer/dashboard/public/veranstalterDashboardPublicEventStateCreate.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

export const Route = createFileRoute("/veranstalter-p/$orgSlug/$eventKey")({
  head: () => seoHeadCreate("/veranstalter-p", { noindex: true }),
  component: PublicEventRoute,
})

function PublicEventRoute() {
  const params = Route.useParams()
  const state = veranstalterDashboardPublicEventStateCreate({
    orgSlug: () => params().orgSlug,
    eventKey: () => params().eventKey,
  })
  return (
    <ClientOnly fallback={<VeranstalterDashboardLoadingState />}>
      <SiteFrame>
        <VeranstalterDashboardPublicEventPage state={state} />
      </SiteFrame>
    </ClientOnly>
  )
}
