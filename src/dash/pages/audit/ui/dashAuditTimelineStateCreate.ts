import { createSignalObject } from "#ui/utils/createSignalObject.js"

import type { DashAuditArea } from "../../../model/dashAuditAreaSchema.ts"
import type { DashAuditEntry } from "../../../model/dashAuditEntrySchema.ts"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashAuditEntriesForScope, dashAuditFilterMeta, dashAuditGroupsCreate } from "../model/dashAuditGroups.ts"

const pageSize = 50

const areaLabels: Record<DashAuditArea, string> = {
  event: "Event",
  tickets: "Tickets",
  codes: "Codes",
  bestellungen: "Bestellungen",
  gaesteliste: "Gästeliste",
  nachrichten: "Nachrichten",
  einlass: "Einlass",
  abendkasse: "Abendkasse",
  profil: "Profil",
  team: "Team",
  einstellungen: "Einstellungen",
  admin: "Admin",
}

export function dashAuditTimelineStateCreate(inputs: {
  orgId: () => string
  eventId: () => string | null
  now: () => Date
  area: () => DashAuditArea | null
  person: () => string | null
  onArea: (value: DashAuditArea | null) => void
  onPerson: (value: string | null) => void
}) {
  const visibleSignal = createSignalObject(pageSize)
  const orgName = () => dashActiveOrg()?.name ?? ""

  const scoped = () =>
    dashAuditEntriesForScope(dashStateGet().audit, { orgId: inputs.orgId(), eventId: inputs.eventId() })

  const meta = () => dashAuditFilterMeta(scoped())

  const groups = () =>
    dashAuditGroupsCreate(
      dashStateGet().audit,
      { orgId: inputs.orgId(), eventId: inputs.eventId(), area: inputs.area(), person: inputs.person() },
      inputs.now(),
    )

  const flat = () => groups().flatMap((group) => group.entries)
  const visible = () => flat().slice(0, visibleSignal.get())
  const hasMore = () => flat().length > visibleSignal.get()

  const more = (): void => {
    visibleSignal.set(visibleSignal.get() + pageSize)
  }

  const visibleGroups = (): { key: string; label: string; entries: DashAuditEntry[] }[] => {
    const remaining = visibleSignal.get()
    let used = 0
    const output: { key: string; label: string; entries: DashAuditEntry[] }[] = []
    for (const group of groups()) {
      if (used >= remaining) break
      const slice = group.entries.slice(0, Math.max(0, remaining - used))
      used += slice.length
      if (slice.length > 0) output.push({ key: group.key, label: group.label, entries: slice })
    }
    return output
  }

  const resetPage = (): void => {
    visibleSignal.set(pageSize)
  }

  const selectArea = (area: DashAuditArea | null): void => {
    resetPage()
    inputs.onArea(area)
  }

  const selectPerson = (person: string | null): void => {
    resetPage()
    inputs.onPerson(person)
  }

  const personLabel = (): string => inputs.person() ?? "Alle Personen"

  return {
    orgName,
    areaLabels,
    scoped,
    meta,
    groups,
    visibleGroups,
    visibleCount: () => visible().length,
    totalCount: () => flat().length,
    hasMore,
    more,
    personLabel,
    selectArea,
    selectPerson,
  }
}

export type DashAuditTimelineState = ReturnType<typeof dashAuditTimelineStateCreate>
