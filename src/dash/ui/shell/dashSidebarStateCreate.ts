import { useLocation } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import { dashEventPhaseGet } from "../../model/dashEventPhaseGet.ts"
import { dashRoleLabel } from "../../model/dashRoleLabel.ts"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashActiveRole } from "../../store/dashActiveRole.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashEventById } from "../../store/dashEventById.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashOrgEvents } from "../../store/dashOrgEvents.ts"
import { dashSessionUser } from "../../store/dashSessionUser.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { type DashNavItem, dashNavItemsCreate } from "./dashNavItemsCreate.ts"

export interface DashEventContext {
  eventId: string
  title: string
  imageUrl: string
  live: boolean
  items: DashNavItem[]
}

export function dashSidebarStateCreate() {
  const location = useLocation()
  const pathname = () => location().pathname
  const state = () => dashStateGet()
  const org = () => dashActiveOrg()
  const role = () => dashActiveRole()
  const user = () => dashSessionUser()
  const roleLabel = () => {
    const current = role()
    return current ? dashRoleLabel(current).label : null
  }
  const upcomingCount = () => {
    const current = org()
    if (!current) return 0
    const now = dashNow()()
    return dashOrgEvents(current.id).filter((event) => new Date(event.startsAt) >= now).length
  }
  const eventId = (): string | null => {
    const match = pathname().match(/^\/demo\/dashboard\/events\/([^/]+)/)
    if (!match?.[1] || match[1] === "neu") return null
    return match[1]
  }
  const event = () => {
    const id = eventId()
    return id ? dashEventById(id) : null
  }
  const eventContext = createMemo((): DashEventContext | null => {
    const current = event()
    if (!current) return null
    const orgEvents = org() ? dashOrgEvents(org()?.id ?? "") : []
    if (!orgEvents.some((entry) => entry.id === current.id)) return null
    const stateSnapshot = state()
    const eventTypes = stateSnapshot.ticketTypes.filter((type) => type.eventId === current.id)
    const sold = stateSnapshot.tickets.filter(
      (ticket) => ticket.eventId === current.id && ticket.status === "gueltig",
    ).length
    const capacity = eventTypes.reduce((sum, type) => sum + type.capacity, 0)
    const phase = dashEventPhaseGet({ event: current, sold, capacity, now: dashNow()() })
    const can = (permission: Parameters<typeof dashCan>[0]) => dashCan(permission)
    const { main } = dashNavItemsCreate({ context: "event", eventId: current.id, eventLive: phase === "live", can })
    return {
      eventId: current.id,
      title: current.title,
      imageUrl: current.imageUrl,
      live: phase === "live",
      items: main,
    }
  })
  const orgNav = createMemo(() => {
    const can = (permission: Parameters<typeof dashCan>[0]) => dashCan(permission)
    return dashNavItemsCreate({ context: "org", upcomingCount: upcomingCount(), can })
  })
  return { pathname, org, role, roleLabel, user, upcomingCount, eventContext, orgNav }
}
