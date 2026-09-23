import { createMemo } from "solid-js"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { adminEventsRouteStateCreate } from "./adminEventsRouteStateCreate.ts"

const route = getRouteApi("/admin/events")

export function adminEventsListRouteStateCreate() {
  const catalog = adminEventsRouteStateCreate()
  const search = route.useSearch()
  const navigate = useNavigate()
  const filteredEvents = createMemo(() => {
    const query = (search().q ?? "").trim().toLocaleLowerCase("de-DE")
    return catalog.events().filter((event) => {
      if (search().event && event.id !== search().event) return false
      if (search().status && (!("status" in event) || event.status !== search().status)) return false
      if (!query) return true
      return [event.title, event.subtitle, event.venue, event.city, event.organizer].some((value) =>
        value.toLocaleLowerCase("de-DE").includes(query),
      )
    })
  })
  const searchChange = (q: string) =>
    void navigate({ to: "/admin/events", search: { ...search(), q: q || undefined }, replace: true })
  const statusChange = (status: string) =>
    void navigate({
      to: "/admin/events",
      search: {
        ...search(),
        status: status === "all" ? undefined : (status as "draft" | "published" | "archived"),
      },
      replace: true,
    })
  const eventChange = (event: string) =>
    void navigate({ to: "/admin/events", search: { ...search(), event: event || undefined }, replace: true })
  return {
    catalog,
    filteredEvents,
    query: () => search().q ?? "",
    status: () => search().status ?? "all",
    statusSignal: { get: () => search().status ?? "all", set: statusChange },
    eventSignal: { get: () => search().event ?? "", set: eventChange },
    eventOptions: () => [
      { type: "item" as const, value: "" },
      ...catalog.events().map((event) => ({ type: "item" as const, value: event.id })),
    ],
    eventText: (id: string) => catalog.events().find((event) => event.id === id)?.title ?? "Alle Events",
    searchChange,
  }
}
