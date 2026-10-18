import { dashEventById } from "../../store/dashEventById.ts"

export interface DashCrumb {
  label: string
  to?: string
}

const dashSubPageLabels: Record<string, string> = {
  details: "Details",
  tickets: "Tickets",
  codes: "Codes",
  bestellungen: "Bestellungen",
  teilnehmer: "Teilnehmer",
  gaesteliste: "Gästeliste",
  einlass: "Einlass",
  abendkasse: "Abendkasse",
  nachrichten: "Nachrichten",
  abrechnung: "Abrechnung",
  protokoll: "Protokoll",
}

const dashOrgPageLabels: Record<string, string> = {
  events: "Events",
  bestellungen: "Bestellungen",
  gutscheine: "Gutscheine",
  finanzen: "Finanzen",
  profil: "Profil",
  team: "Team",
  einstellungen: "Einstellungen",
}

export function dashBreadcrumbStateCreate(pathname: () => string) {
  const crumbs = (): DashCrumb[] => {
    const segments = pathname().split("/").filter(Boolean)
    const rest = segments.slice(2)
    if (rest.length === 0) return [{ label: "Übersicht" }]
    const [first, second, third] = rest
    if (first === "events" && second && second !== "neu") {
      const event = dashEventById(second)
      const title = event?.title ?? "Event"
      const items: DashCrumb[] = [
        { label: "Events", to: "/demo/dashboard/events" },
        { label: title, to: `/demo/dashboard/events/${second}` },
      ]
      if (third) items.push({ label: dashSubPageLabels[third] ?? third })
      else items[1] = { label: title }
      return items
    }
    if (first && dashOrgPageLabels[first]) return [{ label: dashOrgPageLabels[first] as string }]
    if (first === "events" && second === "neu")
      return [{ label: "Events", to: "/demo/dashboard/events" }, { label: "Neues Event" }]
    return [{ label: "Übersicht", to: "/demo/dashboard" }]
  }
  return { crumbs }
}
