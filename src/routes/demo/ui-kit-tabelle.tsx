import { createFileRoute } from "@tanstack/solid-router"
import { UiKitTabelleGallery } from "../../dash/gallery/UiKitTabelleGallery.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/ui-kit-tabelle")({
  head: () =>
    demoRouteHeadCreate(
      "UI-Kit Tabelle",
      "Generische Datentabelle mit Sortierung, Auswahl und mobilen Karten.",
      "/demo/ui-kit-tabelle",
    ),
  component: UiKitTabelleGallery,
})
