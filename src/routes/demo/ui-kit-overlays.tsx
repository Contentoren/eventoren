import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { UiKitOverlaysGallery } from "../../dash/gallery/UiKitOverlaysGallery.tsx"
import { UiContainer } from "../../ui/UiContainer.tsx"

export const Route = createFileRoute("/demo/ui-kit-overlays")({
  head: () =>
    demoRouteHeadCreate(
      "Overlay-Bausteine",
      "Galerie der Overlay-Bausteine: Seitenpanel, Bestätigungsdialog und Speicherleiste.",
      "/demo/ui-kit-overlays",
    ),
  component: () => (
    <UiContainer width="wide" class="flex flex-col gap-6 py-6 sm:py-8">
      <header>
        <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">Overlay-Bausteine</h1>
        <p class="mt-1 text-sm text-content-muted">
          Seitenpanel, Bestätigungsdialog und Speicherleiste zum Ausprobieren.
        </p>
      </header>
      <UiKitOverlaysGallery />
    </UiContainer>
  ),
})
