import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import { adminListViewPreferenceContextUse } from "../viewPreference/adminListViewPreferenceContextUse.ts"
import { adminEventOverviewStateCreate } from "./adminEventOverviewStateCreate.ts"
import { adminEventsArchiveModeGet } from "./adminEventsArchiveModeGet.ts"
import { adminEventsListQueryArgsCreate } from "./adminEventsListQueryArgsCreate.ts"
import { adminEventsRouteStateCreate } from "./adminEventsRouteStateCreate.ts"

const route = getRouteApi("/admin/events")

export function adminEventsListRouteStateCreate() {
  const search = route.useSearch()
  const navigate = useNavigate()
  const viewPreference = adminListViewPreferenceContextUse()
  const archiveMode = createMemo(() => adminEventsArchiveModeGet(search()))
  const catalog = adminEventsRouteStateCreate(() => adminEventsListQueryArgsCreate(search()))
  const filteredEvents = createMemo(() => {
    const query = (search().q ?? "").trim().toLocaleLowerCase("de-DE")
    return catalog.events().filter((event) => {
      if ((event.status === "archived") !== archiveMode()) return false
      if (search().event && event.id !== search().event) return false
      if (!archiveMode() && search().status && search().status !== "archived" && event.status !== search().status)
        return false
      if (!query) return true
      return [event.title, event.subtitle, event.venue, event.city, event.organizer].some((value) =>
        value.toLocaleLowerCase("de-DE").includes(query),
      )
    })
  })
  const activeEvent = createMemo(() => filteredEvents().find((event) => event.id === search().overview))
  const overview = adminEventOverviewStateCreate({
    event: activeEvent,
    onEdit: (eventKey) => void navigate({ to: "/admin/events/$eventKey", params: { eventKey }, search: {} }),
    onBookings: (eventKey) => void navigate({ to: "/admin/bestellungen", search: { event: eventKey } }),
  })
  const searchChange = (q: string) =>
    void navigate({ to: "/admin/events", search: { ...search(), q: q || undefined }, replace: true })
  const statusChange = (status: string) => {
    if (status !== "all" && status !== "draft" && status !== "published" && status !== "archived") return
    void navigate({
      to: "/admin/events",
      search: {
        ...search(),
        status: status === "all" ? undefined : status,
        archive: status === "archived",
      },
      replace: true,
    })
  }
  const eventChange = (event: string) =>
    void navigate({ to: "/admin/events", search: { ...search(), event: event || undefined }, replace: true })
  const archiveToggle = () =>
    void navigate({
      to: "/admin/events",
      search: { ...search(), archive: !archiveMode() },
      replace: true,
    })
  const overviewToggle = (eventKey: string) =>
    void navigate({
      to: "/admin/events",
      search: { ...search(), overview: activeEvent()?.id === eventKey ? undefined : eventKey },
      replace: true,
    })
  return {
    catalog,
    filteredEvents,
    overview,
    overviewToggle,
    overviewExpanded: (eventKey: string) => activeEvent()?.id === eventKey,
    tiles: () => viewPreference?.view() === "tiles",
    query: () => search().q ?? "",
    statusSignal: {
      get: () => (archiveMode() ? "archived" : search().status === "archived" ? "all" : (search().status ?? "all")),
      set: statusChange,
    },
    eventSignal: { get: () => search().event ?? "", set: eventChange },
    archiveMode,
    archiveToggle,
    archiveLabel: () => (archiveMode() ? "Zurück/Alle Events" : "Archiv anzeigen"),
    eventOptions: () => [
      { type: "item" as const, value: "" },
      ...catalog
        .events()
        .filter((event) => (event.status === "archived") === archiveMode())
        .map((event) => ({ type: "item" as const, value: event.id })),
    ],
    eventText: (id: string) => catalog.events().find((event) => event.id === id)?.title ?? "Alle Events",
    searchChange,
  }
}
