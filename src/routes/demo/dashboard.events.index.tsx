import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import { dashEventsSearchParse, type DashEventsSearch } from "../../dash/pages/events/dashEventsPageStateCreate.ts"
import { DashEventDialogsHost } from "../../dash/ui/event/dialogs/DashEventDialogsHost.tsx"
import { DashEventsPage } from "../../dash/pages/events/ui/DashEventsPage.tsx"

export const Route = createFileRoute("/demo/dashboard/events/")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = dashEventsSearchParse(raw)
    const dialogs = dashEventDialogSearchParse(raw)
    const output: Record<string, unknown> = {}
    if (parsed.tab !== "aktuell") output["tab"] = parsed.tab
    if (parsed.q !== "") output["q"] = parsed.q
    if (parsed.ansicht !== "liste") output["ansicht"] = parsed.ansicht
    if (typeof raw["event"] === "string" && raw["event"] !== "") output["event"] = raw["event"]
    return { ...output, ...dialogs }
  },
  head: () =>
    demoRouteHeadCreate("Events · Eventoren Demo", "Alle Events deiner Organisation.", "/demo/dashboard/events"),
  component: DashboardEventsRoute,
})

function DashboardEventsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()

  const parsed = (): DashEventsSearch => dashEventsSearchParse(search() as Record<string, unknown>)

  const patch = (delta: Partial<DashEventsSearch>) => {
    const current = { ...parsed(), ...delta }
    const next: Record<string, string> = {}
    if (current.tab !== "aktuell") next["tab"] = current.tab
    if (current.q !== "") next["q"] = current.q
    if (current.ansicht !== "liste") next["ansicht"] = current.ansicht
    void navigate({ to: "/demo/dashboard/events", search: next, replace: true })
  }

  return (
    <>
      <DashEventsPage search={parsed} onPatch={patch} />
      <DashEventDialogsHost eventId="" eventIdFromSearch />
    </>
  )
}
