import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import type { DashAuditArea } from "../../dash/model/dashAuditAreaSchema.ts"
import { DashSettingsPage } from "../../dash/pages/settings/ui/DashSettingsPage.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

const validAreas = [
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

export const Route = createFileRoute("/demo/dashboard/einstellungen")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const output: Record<string, unknown> = {}
    if (typeof raw.bereich === "string" && validAreas.includes(raw.bereich)) output.bereich = raw.bereich
    if (typeof raw.person === "string" && raw.person.length > 0) output.person = raw.person
    return output
  },
  head: () =>
    demoRouteHeadCreate(
      "Einstellungen · Eventoren Demo",
      "Steuern, Gebühren und Gutscheine.",
      "/demo/dashboard/einstellungen",
    ),
  component: EinstellungenRoute,
})

function EinstellungenRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()

  const area = () => {
    const raw = (search() as Record<string, unknown>).bereich
    return typeof raw === "string" ? raw : null
  }
  const person = () => {
    const raw = (search() as Record<string, unknown>).person
    return typeof raw === "string" && raw.length > 0 ? raw : null
  }

  const patch = (delta: { bereich?: string | null; person?: string | null }) => {
    const next: Record<string, string> = {}
    const nextArea = delta.bereich !== undefined ? delta.bereich : area()
    const nextPerson = delta.person !== undefined ? delta.person : person()
    if (nextArea) next.bereich = nextArea
    if (nextPerson) next.person = nextPerson
    void navigate({ to: "/demo/dashboard/einstellungen", search: next, replace: true })
  }

  return (
    <DashSettingsPage
      area={area() as DashAuditArea | null}
      person={person()}
      onArea={(value) => patch({ bereich: value })}
      onPerson={(value) => patch({ person: value })}
    />
  )
}
