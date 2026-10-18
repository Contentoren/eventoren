import * as v from "valibot"
import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import { DashGuestsPage } from "../../dash/pages/guests/ui/DashGuestsPage.tsx"

const dashGuestsSearchSchema = v.object({
  gast: v.optional(v.string()),
  kontingent: v.optional(v.string()),
})

export const Route = createFileRoute("/demo/dashboard/events/$eventId/gaesteliste")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = v.safeParse(dashGuestsSearchSchema, raw)
    const guests = parsed.success ? parsed.output : {}
    return {
      ...dashEventDialogSearchParse(raw),
      ...(guests.gast !== undefined ? { gast: guests.gast } : {}),
      ...(guests.kontingent !== undefined ? { kontingent: guests.kontingent } : {}),
    }
  },
  head: () =>
    demoRouteHeadCreate("Gästeliste · Eventoren Demo", "Kontingente, Gäste und Freikarten.", "/demo/dashboard/events"),
  component: DashGaestelisteRoute,
})

function DashGaestelisteRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const gast = () => {
    const raw = (search() as Record<string, unknown>)["gast"]
    return typeof raw === "string" && raw.length > 0 ? raw : undefined
  }
  const kontingent = () => {
    const raw = (search() as Record<string, unknown>)["kontingent"]
    return typeof raw === "string" && raw.length > 0 ? raw : undefined
  }
  return <DashGuestsPage eventId={params().eventId} search={{ gast: gast(), kontingent: kontingent() }} />
}
