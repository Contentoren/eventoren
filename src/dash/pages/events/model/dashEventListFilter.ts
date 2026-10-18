import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashEventCategory } from "../../../model/dashEventCategorySchema.ts"

export type DashEventsTab = "aktuell" | "entwuerfe" | "vergangen" | "vorlagen"
export type DashEventListTab = Exclude<DashEventsTab, "vorlagen">

export interface DashEventListStats {
  sold: number
  capacity: number
  revenueCents: number
}

export interface DashEventListRow {
  event: DashEvent
  stats: DashEventListStats
}

export interface DashEventListCategory {
  value: DashEventCategory
  label: string
  count: number
}

const categoryLabels: Record<DashEventCategory, string> = {
  konzert: "Konzert",
  party: "Party",
  abiball: "Abiball",
  kurs: "Kurs",
  kultur: "Kultur",
  sport: "Sport",
  festival: "Festival",
  sonstiges: "Sonstiges",
}

/** Deutsche Bezeichnung einer Eventkategorie. */
export function dashEventCategoryLabel(category: DashEventCategory): string {
  return categoryLabels[category] ?? category
}

/** Ordnet ein Event einem Listen-Tab zu: Entwürfe und Abgesagte zuerst, dann nach Enddatum. */
export function dashEventListTabOf(event: DashEvent, now: Date): DashEventListTab {
  if (event.status === "abgesagt") return "vergangen"
  if (event.status === "entwurf") return "entwuerfe"
  if (now >= new Date(event.endsAt)) return "vergangen"
  return "aktuell"
}

/** Zähler je Tab; Vorlagen kommen aus der Template-Liste der Organisation. */
export function dashEventListCounts(
  events: Array<DashEvent>,
  templateCount: number,
  now: Date,
): Record<DashEventsTab, number> {
  const counts: Record<DashEventsTab, number> = { aktuell: 0, entwuerfe: 0, vergangen: 0, vorlagen: templateCount }
  for (const event of events) counts[dashEventListTabOf(event, now)] += 1
  return counts
}

/** Kategorien mit Trefferzahl innerhalb eines Tabs (für die Filter-Chips). */
export function dashEventListCategories(
  events: Array<DashEvent>,
  tab: DashEventListTab,
  now: Date,
): Array<DashEventListCategory> {
  const per = new Map<DashEventCategory, number>()
  for (const event of events) {
    if (dashEventListTabOf(event, now) !== tab) continue
    per.set(event.category, (per.get(event.category) ?? 0) + 1)
  }
  return [...per.entries()]
    .map(([value, count]) => ({ value, label: dashEventCategoryLabel(value), count }))
    .sort((left, right) => left.label.localeCompare(right.label, "de"))
}

const emptyStats: DashEventListStats = { sold: 0, capacity: 0, revenueCents: 0 }

/** Filtert und sortiert Events eines Tabs nach Suche und Kategorie. */
export function dashEventListRows(args: {
  events: Array<DashEvent>
  statsById: Record<string, DashEventListStats>
  tab: DashEventListTab
  query: string
  category: DashEventCategory | null
  now: Date
}): Array<DashEventListRow> {
  const needle = args.query.trim().toLowerCase()
  const rows: Array<DashEventListRow> = []
  for (const event of args.events) {
    if (dashEventListTabOf(event, args.now) !== args.tab) continue
    if (args.category !== null && event.category !== args.category) continue
    if (needle !== "") {
      const haystack = `${event.title} ${event.venue.name} ${event.venue.city}`.toLowerCase()
      if (!haystack.includes(needle)) continue
    }
    rows.push({ event, stats: args.statsById[event.id] ?? emptyStats })
  }
  if (args.tab === "aktuell") rows.sort((left, right) => (left.event.startsAt < right.event.startsAt ? -1 : 1))
  if (args.tab === "vergangen") rows.sort((left, right) => (left.event.startsAt > right.event.startsAt ? -1 : 1))
  if (args.tab === "entwuerfe") rows.sort((left, right) => (left.event.updatedAt > right.event.updatedAt ? -1 : 1))
  return rows
}
