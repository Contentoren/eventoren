import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import type { DashAuditArea } from "../../dash/model/dashAuditAreaSchema.ts"
import { DashAuditEventPage } from "../../dash/pages/audit/ui/DashAuditEventPage.tsx"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

const validAreas: DashAuditArea[] = [
  "event",
  "tickets",
  "codes",
  "bestellungen",
  "gaesteliste",
  "nachrichten",
  "einlass",
  "abendkasse",
  "profil",
  "team",
  "einstellungen",
  "admin",
]

export const Route = createFileRoute("/demo/dashboard/events/$eventId/protokoll")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = dashEventDialogSearchParse(raw)
    const output: Record<string, unknown> = { ...parsed }
    if (typeof raw.bereich === "string" && (validAreas as string[]).includes(raw.bereich)) output.bereich = raw.bereich
    if (typeof raw.person === "string" && raw.person.length > 0) output.person = raw.person
    return output
  },
  head: () => demoRouteHeadCreate("Protokoll · Eventoren Demo", "Alle Änderungen am Event.", "/demo/dashboard/events"),
  component: ProtokollRoute,
})

function ProtokollRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()

  const area = () => {
    const raw = (search() as Record<string, unknown>).bereich
    return typeof raw === "string" ? (raw as DashAuditArea) : null
  }
  const person = () => {
    const raw = (search() as Record<string, unknown>).person
    return typeof raw === "string" && raw.length > 0 ? raw : null
  }

  const patch = (delta: { bereich?: DashAuditArea | null; person?: string | null }) => {
    const eventId = params().eventId
    const dialog = dashEventDialogSearchParse(search() as Record<string, unknown>)
    const next: Record<string, string> = { ...(dialog as Record<string, string>) }
    const nextArea = delta.bereich !== undefined ? delta.bereich : area()
    const nextPerson = delta.person !== undefined ? delta.person : person()
    if (nextArea) next.bereich = nextArea
    if (nextPerson) next.person = nextPerson
    void navigate({ to: "/demo/dashboard/events/$eventId/protokoll", params: { eventId }, search: next, replace: true })
  }

  return (
    <DashAuditEventPage
      eventId={params().eventId}
      area={area()}
      person={person()}
      onArea={(value) => patch({ bereich: value })}
      onPerson={(value) => patch({ person: value })}
    />
  )
}
