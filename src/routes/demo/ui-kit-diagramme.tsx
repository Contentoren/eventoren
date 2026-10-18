import { createFileRoute } from "@tanstack/solid-router"
import { UiKitDiagrammeGallery } from "../../dash/gallery/UiKitDiagrammeGallery.tsx"
import { uiKitDiagrammeGalleryStateCreate } from "../../dash/gallery/uiKitDiagrammeGalleryStateCreate.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/ui-kit-diagramme")({
  head: () =>
    demoRouteHeadCreate(
      "UI-Kit Diagramme",
      "Flächendiagramme, Sparklines, Balken und Donut ohne Bibliothek.",
      "/demo/ui-kit-diagramme",
    ),
  component: UiKitDiagrammeRoute,
})

function UiKitDiagrammeRoute() {
  const state = uiKitDiagrammeGalleryStateCreate()
  return <UiKitDiagrammeGallery state={state} />
}
