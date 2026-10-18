import { eventDateFormat } from "../../../../events/eventDateFormat.ts"
import type { DashPermission } from "../../../model/dashPermissionSchema.ts"
import type { DashState } from "../../../model/dashStateSchema.ts"
import { dashNavItemsCreate } from "../dashNavItemsCreate.ts"

export type DashPaletteItem = {
  id: string
  label: string
  description?: string
  icon?: string
  keywords?: string[]
  onSelect: () => void
}

export type DashPaletteGroup = {
  id: string
  label: string
  items: DashPaletteItem[]
}

export function dashPaletteGroupsCreate(args: {
  state: DashState
  orgId: string
  permissions: ReadonlySet<DashPermission>
  query: string
  currentEventId: string | null
  navigate: (to: string) => void
  toggleTheme: () => void
}): DashPaletteGroup[] {
  const { state, orgId, permissions, query, currentEventId, navigate, toggleTheme } = args
  const can = (permission: DashPermission): boolean => permissions.has(permission)
  const needle = query.trim().toLowerCase()
  const matches = (item: { label: string; description?: string; keywords?: string[] }): boolean => {
    if (needle === "") return true
    const haystack = [item.label, item.description ?? "", ...(item.keywords ?? [])].join(" ").toLowerCase()
    return haystack.includes(needle)
  }
  const select = (to: string) => () => navigate(to)

  const seiten: DashPaletteItem[] = []
  const orgNav = dashNavItemsCreate({ context: "org", can })
  for (const item of [...orgNav.main, ...(orgNav.section ?? [])]) {
    const entry: DashPaletteItem = {
      id: `seite-${item.to}`,
      label: item.label,
      icon: item.icon,
      keywords: [item.label],
      onSelect: select(item.to),
    }
    if (matches(entry)) seiten.push(entry)
  }
  const currentEvent =
    currentEventId !== null
      ? (state.events.find((event) => event.id === currentEventId && event.orgId === orgId) ?? null)
      : null
  if (currentEvent) {
    const eventNav = dashNavItemsCreate({ context: "event", eventId: currentEvent.id, can })
    for (const item of eventNav.main) {
      const entry: DashPaletteItem = {
        id: `seite-event-${currentEvent.id}-${item.to}`,
        label: item.label,
        description: currentEvent.title,
        icon: item.icon,
        keywords: [item.label, currentEvent.title],
        onSelect: select(item.to),
      }
      if (matches(entry)) seiten.push(entry)
    }
  }

  const nowMs = Date.parse(state.seededAt)
  const orgEvents = state.events
    .filter((event) => event.orgId === orgId)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const ereignisse: DashPaletteItem[] = []
  for (const event of orgEvents) {
    const entry: DashPaletteItem = {
      id: `event-${event.id}`,
      label: event.title,
      description: `${eventDateFormat(event.startsAt)} · ${event.venue.name}`,
      icon: "events",
      keywords: [event.title, event.venue.name, event.venue.city],
      onSelect: select(`/demo/dashboard/events/${event.id}`),
    }
    if (matches(entry)) ereignisse.push(entry)
  }

  const bestellungen: DashPaletteItem[] = []
  if (needle.length >= 2) {
    const hits = state.orders
      .filter((order) => order.orgId === orgId)
      .filter((order) => {
        const name = `${order.buyer.firstName} ${order.buyer.lastName}`.toLowerCase()
        return (
          order.number.toLowerCase().includes(needle) ||
          name.includes(needle) ||
          order.buyer.email.toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 8)
    for (const order of hits) {
      bestellungen.push({
        id: `bestellung-${order.id}`,
        label: order.number,
        description: `${order.buyer.firstName} ${order.buyer.lastName} · ${order.buyer.email}`,
        icon: "orders",
        keywords: [order.number, `${order.buyer.firstName} ${order.buyer.lastName}`, order.buyer.email],
        onSelect: select(`/demo/dashboard/events/${order.eventId}/bestellungen?bestellung=${order.id}`),
      })
    }
  }

  const upcoming =
    orgEvents.find((event) => event.status === "veroeffentlicht" && Date.parse(event.startsAt) > nowMs) ?? null
  const actionEvent = currentEvent ?? upcoming
  const aktionen: DashPaletteItem[] = []
  const pushAction = (item: DashPaletteItem) => {
    if (matches(item)) aktionen.push(item)
  }
  if (can("events.bearbeiten")) {
    pushAction({
      id: "aktion-event-erstellen",
      label: "Event erstellen",
      icon: "events",
      keywords: ["Event erstellen", "neu", "anlegen"],
      onSelect: select("/demo/dashboard/events/neu"),
    })
  }
  if (actionEvent) {
    const base = `/demo/dashboard/events/${actionEvent.id}`
    if (can("codes.bearbeiten")) {
      pushAction({
        id: "aktion-code-erstellen",
        label: "Code erstellen",
        description: actionEvent.title,
        icon: "codes",
        keywords: ["Code erstellen", "Rabatt", "Zugangscode", actionEvent.title],
        onSelect: select(`${base}/codes?code=neu`),
      })
    }
    if (can("gaesteliste.bearbeiten")) {
      pushAction({
        id: "aktion-gast-hinzufuegen",
        label: "Gast hinzufügen",
        description: actionEvent.title,
        icon: "guestlist",
        keywords: ["Gast hinzufügen", "Gästeliste", "Freikarte", actionEvent.title],
        onSelect: select(`${base}/gaesteliste?gast=neu`),
      })
    }
    if (can("nachrichten.senden")) {
      pushAction({
        id: "aktion-nachricht-schreiben",
        label: "Nachricht schreiben",
        description: actionEvent.title,
        icon: "messages",
        keywords: ["Nachricht schreiben", "E-Mail", "Rundmail", actionEvent.title],
        onSelect: select(`${base}/nachrichten?nachricht=neu`),
      })
    }
  }
  pushAction({
    id: "aktion-theme-umschalten",
    label: "Hell/Dunkel umschalten",
    keywords: ["Hell", "Dunkel", "Theme", "Dark Mode", "umschalten"],
    onSelect: () => toggleTheme(),
  })

  const emptyQuery = needle === ""
  const groups: DashPaletteGroup[] = []
  // Leere Suche: Aktionen zuerst (max. 5), damit sie ohne Scrollen sichtbar sind;
  // mit Query gilt Relevanz-Reihenfolge (Seiten, Events, Bestellungen, Aktionen).
  if (emptyQuery && aktionen.length > 0) groups.push({ id: "aktionen", label: "Aktionen", items: aktionen.slice(0, 5) })
  if (seiten.length > 0) groups.push({ id: "seiten", label: "Seiten", items: seiten })
  if (ereignisse.length > 0) groups.push({ id: "events", label: "Events", items: ereignisse })
  if (bestellungen.length > 0) groups.push({ id: "bestellungen", label: "Bestellungen", items: bestellungen })
  if (!emptyQuery && aktionen.length > 0) groups.push({ id: "aktionen", label: "Aktionen", items: aktionen })
  return groups
}
