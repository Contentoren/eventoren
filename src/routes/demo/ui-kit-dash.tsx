import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "#src/demo/model/demoRouteHeadCreate.ts"
import { UiKitDashGallery } from "#src/dash/gallery/UiKitDashGallery.tsx"
import { uiKitDashGalleryStateCreate } from "#src/dash/gallery/uiKitDashGalleryStateCreate.ts"

export const Route = createFileRoute("/demo/ui-kit-dash")({
  head: () => demoRouteHeadCreate("Dash-UI-Kit", "Interaktive Galerie der Dashboard-Bausteine.", "/demo/ui-kit-dash"),
  component: UiKitDashRoute,
})

function UiKitDashRoute() {
  const state = uiKitDashGalleryStateCreate()
  return <UiKitDashGallery state={state} />
}
