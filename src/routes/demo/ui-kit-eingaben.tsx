import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { UiKitEingabenGallery } from "../../dash/gallery/UiKitEingabenGallery.tsx"
import { uiKitEingabenGalleryStateCreate } from "../../dash/gallery/uiKitEingabenGalleryStateCreate.ts"

export const Route = createFileRoute("/demo/ui-kit-eingaben")({
  head: () =>
    demoRouteHeadCreate("Eingaben-UI-Kit", "Interaktive Galerie der Eingabekomponenten.", "/demo/ui-kit-eingaben"),
  component: UiKitEingabenRoute,
})

function UiKitEingabenRoute() {
  const state = uiKitEingabenGalleryStateCreate()
  return <UiKitEingabenGallery state={state} />
}
