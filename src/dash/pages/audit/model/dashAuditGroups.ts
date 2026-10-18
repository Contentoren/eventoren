import type { DashAuditArea } from "../../../model/dashAuditAreaSchema.ts"
import type { DashAuditEntry } from "../../../model/dashAuditEntrySchema.ts"

export interface DashAuditDayGroup {
  key: string
  label: string
  entries: DashAuditEntry[]
}

export interface DashAuditFilterMeta {
  areas: { area: DashAuditArea; count: number }[]
  actors: { actor: string; count: number }[]
}

const berlinDateOnly = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const berlinDayLabel = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "numeric",
  month: "short",
})

function dashAuditDayParts(date: Date): { key: string; year: number; month: number; day: number } {
  const parts = berlinDateOnly.formatToParts(date)
  const part = (type: string): string => parts.find((entry) => entry.type === type)?.value ?? "01"
  const year = Number(part("year"))
  const month = Number(part("month"))
  const day = Number(part("day"))
  const two = (value: number): string => String(value).padStart(2, "0")
  return { key: `${year}-${two(month)}-${two(day)}`, year, month, day }
}

function dashAuditDayKey(iso: string): string {
  return dashAuditDayParts(new Date(iso)).key
}

function dashAuditDayLabel(key: string, now: Date): string {
  const today = dashAuditDayKey(now.toISOString())
  const yesterdayMs = now.getTime() - 86_400_000
  const yesterday = dashAuditDayKey(new Date(yesterdayMs).toISOString())
  if (key === today) return "Heute"
  if (key === yesterday) return "Gestern"
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return key
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
  return berlinDayLabel.format(date)
}

/** Filtert und sortiert Protokolleinträge für eine Organisation (optional je Event), neueste zuerst. */
export function dashAuditEntriesForScope(
  entries: readonly DashAuditEntry[],
  scope: { orgId: string; eventId?: string | null },
): DashAuditEntry[] {
  return entries
    .filter((entry) => entry.orgId === scope.orgId && (scope.eventId ? entry.eventId === scope.eventId : true))
    .slice()
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
}

/** Zählt vorhandene Bereiche und Personen für Filter-Chips (nur mit echten Einträgen). */
export function dashAuditFilterMeta(entries: readonly DashAuditEntry[]): DashAuditFilterMeta {
  const areaCounts = new Map<DashAuditArea, number>()
  const actorCounts = new Map<string, number>()
  for (const entry of entries) {
    areaCounts.set(entry.area, (areaCounts.get(entry.area) ?? 0) + 1)
    actorCounts.set(entry.actor, (actorCounts.get(entry.actor) ?? 0) + 1)
  }
  return {
    areas: [...areaCounts.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((left, right) => right.count - left.count),
    actors: [...actorCounts.entries()]
      .map(([actor, count]) => ({ actor, count }))
      .sort((left, right) => right.count - left.count),
  }
}

/** Gruppiert Einträge nach Berliner Kalendertag: Heute, Gestern, sonst „Mi., 14. Okt.“. */
export function dashAuditGroupsCreate(
  entries: readonly DashAuditEntry[],
  scope: { orgId: string; eventId?: string | null; area?: DashAuditArea | null; person?: string | null },
  now: Date,
): DashAuditDayGroup[] {
  const scoped = dashAuditEntriesForScope(entries, scope).filter(
    (entry) =>
      (scope.area === undefined || scope.area === null || entry.area === scope.area) &&
      (scope.person === undefined || scope.person === null || scope.person === "" || entry.actor === scope.person),
  )
  const byDay = new Map<string, DashAuditEntry[]>()
  for (const entry of scoped) {
    const key = dashAuditDayKey(entry.at)
    const list = byDay.get(key)
    if (list) list.push(entry)
    else byDay.set(key, [entry])
  }
  return [...byDay.entries()]
    .sort((left, right) => (left[0] < right[0] ? 1 : left[0] > right[0] ? -1 : 0))
    .map(([key, dayEntries]) => ({ key, label: dashAuditDayLabel(key, now), entries: dayEntries }))
}
