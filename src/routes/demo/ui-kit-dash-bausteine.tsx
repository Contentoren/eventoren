import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { UiKitDashBausteineGallery } from "../../dash/gallery/UiKitDashBausteineGallery.tsx"
import { uiKitDashBausteineGalleryStateCreate } from "../../dash/gallery/uiKitDashBausteineGalleryStateCreate.ts"

export const Route = createFileRoute("/demo/ui-kit-dash-bausteine")({
  head: () =>
    demoRouteHeadCreate(
      "Dash-Bausteine-UI-Kit",
      "Interaktive Galerie der Dashboard-Bausteine.",
      "/demo/ui-kit-dash-bausteine",
    ),
  component: UiKitDashBausteineRoute,
})

function UiKitDashBausteineRoute() {
  const state = uiKitDashBausteineGalleryStateCreate()
  return <UiKitDashBausteineGallery state={state} />
}
