import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashEventLayout } from "../../dash/ui/event/DashEventLayout.tsx"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"

export const Route = createFileRoute("/demo/dashboard/events/$eventId")({
  // Eigene validateSearch, damit der DashEventDialogsHost in diesem Layout die
  // Dialog-Flags via useSearch({ strict: false }) sieht (Kind-Routen validieren
  // sie zusätzlich je für ihren eigenen Match).
  validateSearch: (input: unknown): Record<string, unknown> =>
    dashEventDialogSearchParse((input ?? {}) as Record<string, unknown>),
  head: () =>
    demoRouteHeadCreate("Event · Veranstalter-Dashboard", "Event-Übersicht und Verwaltung.", "/demo/dashboard/events"),
  component: DashEventLayoutRoute,
})

function DashEventLayoutRoute() {
  const params = Route.useParams()
  return <DashEventLayout eventId={params().eventId} />
}
