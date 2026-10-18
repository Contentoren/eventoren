import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoSiteFrame } from "../../demo/ui/DemoSiteFrame.tsx"
import { DashEventPreviewPage } from "../../dash/public/event/ui/DashEventPreviewPage.tsx"
import { dashEventPreviewStateCreate } from "../../dash/public/event/model/dashEventPreviewStateCreate.ts"
import { DashProfileSkeleton } from "../../dash/public/profile/DashProfileSkeleton.tsx"

export const Route = createFileRoute("/demo/customer_/veranstalter_/$orgSlug_/$eventSlug")({
  head: () =>
    demoRouteHeadCreate(
      "Event-Vorschau-Demo",
      "Lokale Event-Vorschau aus Dashboard-Daten.",
      "/demo/customer/veranstalter/kulturhaus-lindenhof/jazz-und-wein",
    ),
  component: DashEventPreviewRoute,
})

function DashEventPreviewRoute() {
  const params = Route.useParams()
  const state = dashEventPreviewStateCreate({
    orgSlug: () => params().orgSlug,
    eventSlug: () => params().eventSlug,
  })
  return (
    <DemoSiteFrame currentId="event-preview">
      <ClientOnly fallback={<DashProfileSkeleton />}>
        <DashEventPreviewPage state={state} />
      </ClientOnly>
    </DemoSiteFrame>
  )
}
