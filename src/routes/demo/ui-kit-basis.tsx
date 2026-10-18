import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { UiKitBasisGallery } from "../../dash/gallery/UiKitBasisGallery.tsx"
import { uiKitBasisGalleryStateCreate } from "../../dash/gallery/uiKitBasisGalleryStateCreate.ts"

export const Route = createFileRoute("/demo/ui-kit-basis")({
  head: () => demoRouteHeadCreate("Basis-UI-Kit", "Interaktive Galerie der Anzeige-Komponenten.", "/demo/ui-kit-basis"),
  component: UiKitBasisRoute,
})

function UiKitBasisRoute() {
  const state = uiKitBasisGalleryStateCreate()
  return <UiKitBasisGallery state={state} />
}
