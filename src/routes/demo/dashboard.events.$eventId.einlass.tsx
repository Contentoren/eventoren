import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import * as v from "valibot"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import {
  dashCheckinPageStateCreate,
  dashCheckinSearchParse,
  type DashCheckinSearch,
} from "../../dash/pages/checkin/dashCheckinPageStateCreate.ts"
import { DashCheckinPage } from "../../dash/pages/checkin/ui/DashCheckinPage.tsx"

export const Route = createFileRoute("/demo/dashboard/events/$eventId/einlass")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const dialog = dashEventDialogSearchParse((input ?? {}) as Record<string, unknown>)
    const scans = v.safeParse(
      v.picklist(["alle", "akzeptiert", "abgelehnt"]),
      (input as Record<string, unknown> | null)?.["scans"],
    )
    return { ...dialog, ...(scans.success && scans.output !== "alle" ? { scans: scans.output } : {}) }
  },
  head: () =>
    demoRouteHeadCreate("Live-Einlass · Eventoren Demo", "Check-ins, Scanner und Statistik.", "/demo/dashboard/events"),
  component: EventEinlassRoute,
})

function EventEinlassRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()

  const parsed = (): DashCheckinSearch => dashCheckinSearchParse(search() as Record<string, unknown>)

  const patch = (delta: Partial<DashCheckinSearch>) => {
    const dialog = dashEventDialogSearchParse(search() as Record<string, unknown>)
    const next: Record<string, string> = { ...(dialog as Record<string, string>) }
    const scans = delta.scans ?? parsed().scans
    if (scans !== "alle") next["scans"] = scans
    void navigate({
      to: "/demo/dashboard/events/$eventId/einlass",
      params: { eventId: params().eventId },
      search: next,
      replace: true,
    })
  }

  const state = dashCheckinPageStateCreate({ eventId: () => params().eventId, search: parsed, onPatch: patch })

  return <DashCheckinPage eventId={params().eventId} state={state} />
}
