import type { DashPermission } from "../../model/dashPermissionSchema.ts"

export type DashNavContext = "org" | "event"

export interface DashNavItem {
  label: string
  to: string
  icon: string
  count?: number
  match: "exact" | "prefix"
  permission: DashPermission | null
  liveDot?: boolean
}

const dashOrgNavItemsBase: ReadonlyArray<Omit<DashNavItem, "to" | "count"> & { key: string }> = [
  { key: "uebersicht", label: "Übersicht", icon: "dashboard", match: "exact", permission: null },
  { key: "events", label: "Events", icon: "events", match: "prefix", permission: null },
  { key: "bestellungen", label: "Bestellungen", icon: "orders", match: "prefix", permission: "bestellungen.sehen" },
  { key: "gutscheine", label: "Gutscheine", icon: "vouchers", match: "prefix", permission: "gutscheine.bearbeiten" },
  { key: "finanzen", label: "Finanzen", icon: "finance", match: "prefix", permission: "finanzen.sehen" },
]

const dashOrgSectionItemsBase: ReadonlyArray<Omit<DashNavItem, "to"> & { key: string }> = [
  { key: "profil", label: "Profil", icon: "profile", match: "prefix", permission: "profil.bearbeiten" },
  { key: "team", label: "Team", icon: "team", match: "prefix", permission: "team.verwalten" },
  {
    key: "einstellungen",
    label: "Einstellungen",
    icon: "settings",
    match: "prefix",
    permission: "einstellungen.bearbeiten",
  },
]

const dashEventNavSubPaths: ReadonlyArray<{
  key: string
  label: string
  icon: string
  permission: DashPermission | "either-orders-entry" | "either-events-finance" | null
}> = [
  { key: "", label: "Übersicht", icon: "eventOverview", permission: null },
  { key: "details", label: "Details", icon: "details", permission: "events.bearbeiten" },
  { key: "tickets", label: "Tickets", icon: "tickets", permission: "tickets.bearbeiten" },
  { key: "codes", label: "Codes", icon: "codes", permission: "codes.bearbeiten" },
  { key: "bestellungen", label: "Bestellungen", icon: "orders", permission: "bestellungen.sehen" },
  { key: "teilnehmer", label: "Teilnehmer", icon: "attendees", permission: "either-orders-entry" },
  { key: "gaesteliste", label: "Gästeliste", icon: "guestlist", permission: "gaesteliste.bearbeiten" },
  { key: "einlass", label: "Einlass", icon: "entry", permission: "einlass.nutzen" },
  { key: "abendkasse", label: "Abendkasse", icon: "boxOffice", permission: "abendkasse.nutzen" },
  { key: "nachrichten", label: "Nachrichten", icon: "messages", permission: "nachrichten.senden" },
  { key: "abrechnung", label: "Abrechnung", icon: "settlement", permission: "finanzen.sehen" },
  { key: "protokoll", label: "Protokoll", icon: "log", permission: "either-events-finance" },
]

export function dashNavItemsCreate(args: {
  context: DashNavContext
  eventId?: string
  upcomingCount?: number
  eventLive?: boolean
  can: (permission: DashPermission) => boolean
}): { main: DashNavItem[]; section?: DashNavItem[] } {
  const { context, eventId, upcomingCount, eventLive, can } = args
  if (context === "event" && eventId) {
    const base = `/demo/dashboard/events/${eventId}`
    const main: DashNavItem[] = []
    for (const entry of dashEventNavSubPaths) {
      if (entry.permission === "either-orders-entry") {
        if (!can("bestellungen.sehen") && !can("einlass.nutzen")) continue
      } else if (entry.permission === "either-events-finance") {
        if (!can("events.bearbeiten") && !can("finanzen.sehen")) continue
      } else if (entry.permission !== null && !can(entry.permission)) {
        continue
      }
      main.push({
        label: entry.label,
        to: entry.key === "" ? base : `${base}/${entry.key}`,
        icon: entry.icon,
        match: entry.key === "" ? "exact" : "prefix",
        permission:
          entry.permission === "either-orders-entry" || entry.permission === "either-events-finance"
            ? null
            : entry.permission,
        liveDot: entry.key === "einlass" ? eventLive === true : undefined,
      })
    }
    return { main }
  }
  const main: DashNavItem[] = []
  for (const entry of dashOrgNavItemsBase) {
    if (entry.permission !== null && !can(entry.permission)) continue
    main.push({
      label: entry.label,
      to: entry.key === "uebersicht" ? "/demo/dashboard" : `/demo/dashboard/${entry.key}`,
      icon: entry.icon,
      count: entry.key === "events" ? upcomingCount : undefined,
      match: entry.match,
      permission: entry.permission,
    })
  }
  const section: DashNavItem[] = []
  for (const entry of dashOrgSectionItemsBase) {
    if (entry.permission !== null && !can(entry.permission)) continue
    section.push({
      label: entry.label,
      to: `/demo/dashboard/${entry.key}`,
      icon: entry.icon,
      match: entry.match,
      permission: entry.permission,
    })
  }
  return { main, section }
}
