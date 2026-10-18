import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashEventHeader } from "../../dash/ui/event/DashEventHeader.tsx"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import { DashEventOverviewPage } from "../../dash/pages/event-overview/DashEventOverviewPage.tsx"

export const Route = createFileRoute("/demo/dashboard/events/$eventId/")({
  validateSearch: (input: unknown): Record<string, unknown> =>
    dashEventDialogSearchParse((input ?? {}) as Record<string, unknown>),
  head: () =>
    demoRouteHeadCreate("Event · Veranstalter-Dashboard", "Event-Übersicht mit Kennzahlen.", "/demo/dashboard/events"),
  component: DashEventIndexRoute,
})

function DashEventIndexRoute() {
  const params = Route.useParams()
  return (
    <div>
      <DashEventHeader eventId={params().eventId} />
      <DashEventOverviewPage eventId={params().eventId} />
    </div>
  )
}
