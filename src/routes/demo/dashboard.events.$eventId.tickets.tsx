import * as v from "valibot"
import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import { DashTicketsPage } from "../../dash/pages/tickets/ui/DashTicketsPage.tsx"

const dashTicketsSearchSchema = v.object({
  ticket: v.optional(v.string()),
  kanal: v.optional(v.string()),
})

export const Route = createFileRoute("/demo/dashboard/events/$eventId/tickets")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const parsed = v.safeParse(dashTicketsSearchSchema, (input ?? {}) as Record<string, unknown>)
    return {
      ...dashEventDialogSearchParse((input ?? {}) as Record<string, unknown>),
      ...(parsed.success ? parsed.output : {}),
    }
  },
  head: () =>
    demoRouteHeadCreate("Tickets · Eventoren Demo", "Ticketarten, Phasen und Kontingente.", "/demo/dashboard/events"),
  component: DashTicketsRoute,
})

function DashTicketsRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  return <DashTicketsPage eventId={params().eventId} ticketParam={search().ticket} />
}
