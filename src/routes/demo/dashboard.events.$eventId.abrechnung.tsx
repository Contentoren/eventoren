import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashPageHeader } from "../../dash/ui/DashPageHeader.tsx"
import { DashSettlementPage } from "../../dash/pages/finance/ui/DashSettlementPage.tsx"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"

export const Route = createFileRoute("/demo/dashboard/events/$eventId/abrechnung")({
  validateSearch: (input: unknown): Record<string, unknown> =>
    dashEventDialogSearchParse((input ?? {}) as Record<string, unknown>),
  head: () =>
    demoRouteHeadCreate("Abrechnung · Eventoren Demo", "Erlöse, Gebühren und Auszahlung.", "/demo/dashboard/events"),
  component: EventAbrechnungRoute,
})

function EventAbrechnungRoute() {
  const params = Route.useParams()
  return (
    <div>
      <DashPageHeader title="Abrechnung" description="Erlöse, Gebühren und Auszahlung." />
      <DashSettlementPage eventId={params().eventId} />
    </div>
  )
}
