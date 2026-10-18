import { useLocation, useNavigate } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashEventById } from "../../../store/dashEventById.ts"
import { dashOrgEvents } from "../../../store/dashOrgEvents.ts"
import { dashSidebarStateCreate } from "../dashSidebarStateCreate.ts"

export function dashEventSwitcherStateCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const sidebar = dashSidebarStateCreate()
  const open = createSignalObject(false)
  const query = createSignalObject("")
  const context = () => sidebar.eventContext()
  const currentId = () => context()?.eventId ?? null
  const title = () => context()?.title ?? "–"
  const imageUrl = () => context()?.imageUrl ?? ""
  const live = () => context()?.live ?? false
  const dateLabel = () => {
    const id = currentId()
    const event = id ? dashEventById(id) : null
    return event ? dashDateFormat(event.startsAt, "wochentag-datum") : null
  }
  const filtered = () => {
    const org = dashActiveOrg()
    if (!org) return []
    const needle = query.get().trim().toLowerCase()
    const list = dashOrgEvents(org.id)
    return needle ? list.filter((event) => event.title.toLowerCase().includes(needle)) : list
  }
  const subPath = () => {
    const match = location().pathname.match(/^\/demo\/dashboard\/events\/[^/]+(\/.*)?$/)
    return match?.[1] ?? ""
  }
  const select = (eventId: string) => {
    open.set(false)
    query.set("")
    navigate({ to: `/demo/dashboard/events/${eventId}${subPath()}` })
  }
  const allEvents = () => {
    open.set(false)
    query.set("")
    navigate({ to: "/demo/dashboard/events" })
  }
  return { open, query, currentId, title, imageUrl, live, dateLabel, filtered, select, allEvents }
}

export type DashEventSwitcherState = ReturnType<typeof dashEventSwitcherStateCreate>
