import * as v from "valibot"
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashPageHeader } from "../../dash/ui/DashPageHeader.tsx"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import { DashAttendeesPage } from "../../dash/pages/attendees/ui/DashAttendeesPage.tsx"
import {
  dashAttendeeSearchParse,
  type DashAttendeeSearch,
} from "../../dash/pages/attendees/model/dashAttendeeSearchParse.ts"

const rawCheckin = v.optional(v.picklist(["alle", "eingecheckt", "offen"]))
const rawKanal = v.optional(v.picklist(["alle", "online", "abendkasse", "gaesteliste"]))

export const Route = createFileRoute("/demo/dashboard/events/$eventId/teilnehmer")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    return { ...dashEventDialogSearchParse(raw), ...dashAttendeesSearchNarrow(raw) }
  },
  head: () =>
    demoRouteHeadCreate("Teilnehmer · Eventoren Demo", "Ticketinhaber und Exporte.", "/demo/dashboard/events"),
  component: EventTeilnehmerRoute,
})

function dashAttendeesSearchNarrow(raw: Record<string, unknown>): Record<string, unknown> {
  const parsed = dashAttendeeSearchParse(raw)
  const checkin = v.safeParse(rawCheckin, raw["checkin"])
  const kanal = v.safeParse(rawKanal, raw["kanal"])
  const output: Record<string, unknown> = {}
  if (parsed.q !== "") output["q"] = parsed.q
  if (parsed.ticketart !== "") output["ticketart"] = parsed.ticketart
  if (checkin.success && checkin.output !== undefined && checkin.output !== "alle") output["checkin"] = checkin.output
  if (kanal.success && kanal.output !== undefined && kanal.output !== "alle") output["kanal"] = kanal.output
  return output
}

function EventTeilnehmerRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()

  const parsed = (): DashAttendeeSearch => dashAttendeeSearchParse(search() as Record<string, unknown>)

  const patch = (delta: Partial<DashAttendeeSearch>) => {
    const current = { ...parsed(), ...delta }
    const eventId = params().eventId
    const dialog = dashEventDialogSearchParse(search() as Record<string, unknown>)
    const next: Record<string, string> = { ...(dialog as Record<string, string>) }
    if (current.q !== "") next["q"] = current.q
    if (current.ticketart !== "") next["ticketart"] = current.ticketart
    if (current.checkin !== "alle") next["checkin"] = current.checkin
    if (current.kanal !== "alle") next["kanal"] = current.kanal
    void navigate({
      to: "/demo/dashboard/events/$eventId/teilnehmer",
      params: { eventId },
      search: next,
      replace: true,
    })
  }

  return (
    <div>
      <DashPageHeader title="Teilnehmer" description="Ticketinhaber und Exporte." />
      <DashAttendeesPage eventId={params().eventId} search={parsed} onPatch={patch} />
    </div>
  )
}
