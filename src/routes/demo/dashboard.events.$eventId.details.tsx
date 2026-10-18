import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashDetailsPage } from "../../dash/pages/details/ui/DashDetailsPage.tsx"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"

export const Route = createFileRoute("/demo/dashboard/events/$eventId/details")({
  validateSearch: (input: unknown): Record<string, unknown> =>
    dashEventDialogSearchParse((input ?? {}) as Record<string, unknown>),
  head: () =>
    demoRouteHeadCreate(
      "Details · Eventoren Demo",
      "Basisdaten, Ort, Bild und Beschreibung.",
      "/demo/dashboard/events",
    ),
  component: DashDetailsRoute,
})

function DashDetailsRoute() {
  const params = Route.useParams()
  return <DashDetailsPage eventId={params().eventId} />
}
