import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashPageHeader } from "../../dash/ui/DashPageHeader.tsx"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import {
  dashOrdersSearchParse,
  DashOrdersPage,
  type DashOrdersSearch,
} from "../../dash/pages/orders/ui/DashOrdersPage.tsx"

export const Route = createFileRoute("/demo/dashboard/events/$eventId/bestellungen")({
  validateSearch: (input: unknown): Record<string, unknown> => ({
    ...dashEventDialogSearchParse((input ?? {}) as Record<string, unknown>),
    ...dashOrdersSearchNarrow((input ?? {}) as Record<string, unknown>),
  }),
  head: () =>
    demoRouteHeadCreate(
      "Bestellungen · Eventoren Demo",
      "Bezahlungen, Erstattungen und Notizen.",
      "/demo/dashboard/events",
    ),
  component: EventBestellungenRoute,
})

function dashOrdersSearchNarrow(raw: Record<string, unknown>): Record<string, unknown> {
  const parsed = dashOrdersSearchParse(raw)
  const output: Record<string, unknown> = {}
  if (parsed.q !== "") output["q"] = parsed.q
  if (parsed.status !== "alle") output["status"] = parsed.status
  if (parsed.kanal !== "alle") output["kanal"] = parsed.kanal
  if (parsed.bestellung !== undefined) output["bestellung"] = parsed.bestellung
  return output
}

function EventBestellungenRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()

  const parsed = (): DashOrdersSearch => dashOrdersSearchParse(search() as Record<string, unknown>)

  const patch = (delta: Partial<DashOrdersSearch>) => {
    const current = { ...parsed(), ...delta }
    const eventId = params().eventId
    const dialog = dashEventDialogSearchParse(search() as Record<string, unknown>)
    const next: Record<string, string> = { ...(dialog as Record<string, string>) }
    if (current.q !== "") next["q"] = current.q
    if (current.status !== "alle") next["status"] = current.status
    if (current.kanal !== "alle") next["kanal"] = current.kanal
    if (current.bestellung !== undefined) next["bestellung"] = current.bestellung
    void navigate({
      to: "/demo/dashboard/events/$eventId/bestellungen",
      params: { eventId },
      search: next,
      replace: true,
    })
  }

  return (
    <div>
      <DashPageHeader title="Bestellungen" description="Bezahlungen, Erstattungen und Notizen." />
      <DashOrdersPage eventId={params().eventId} search={parsed} onPatch={patch} />
    </div>
  )
}
