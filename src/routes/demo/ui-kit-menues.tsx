import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { UiKitMenuesGallery } from "../../dash/gallery/UiKitMenuesGallery.tsx"
import { uiKitMenuesGalleryStateCreate } from "../../dash/gallery/uiKitMenuesGalleryStateCreate.ts"

export const Route = createFileRoute("/demo/ui-kit-menues")({
  head: () =>
    demoRouteHeadCreate(
      "Menüs-UI-Kit",
      "Interaktive Galerie für Menüs, Palette und Bild-Upload.",
      "/demo/ui-kit-menues",
    ),
  component: UiKitMenuesRoute,
})

function UiKitMenuesRoute() {
  const state = uiKitMenuesGalleryStateCreate()
  return <UiKitMenuesGallery state={state} />
}
