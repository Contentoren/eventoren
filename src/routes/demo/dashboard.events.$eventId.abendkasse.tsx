import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashBoxOfficePage } from "../../dash/pages/boxoffice/ui/DashBoxOfficePage.tsx"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"

export const Route = createFileRoute("/demo/dashboard/events/$eventId/abendkasse")({
  validateSearch: (input: unknown): Record<string, unknown> =>
    dashEventDialogSearchParse((input ?? {}) as Record<string, unknown>),
  head: () =>
    demoRouteHeadCreate("Abendkasse · Eventoren Demo", "Kassen-Tickets und offene Vorgänge.", "/demo/dashboard/events"),
  component: DashBoxOfficeRoute,
})

function DashBoxOfficeRoute() {
  const params = Route.useParams()
  return <DashBoxOfficePage eventId={params().eventId} />
}
