import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import type { DashState } from "../../../model/dashStateSchema.ts"

export type DashOverviewTodo = {
  id: string
  title: string
  href: string
}

export function dashOverviewTodosCreate(args: {
  state: DashState
  org: DashOrg
  events: DashEvent[]
}): DashOverviewTodo[] {
  const { state, org, events } = args
  const todos: DashOverviewTodo[] = []
  for (const event of events) {
    if (event.status === "entwurf") {
      todos.push({
        id: `entwurf-${event.id}`,
        title: `${event.title} veröffentlichen`,
        href: `/demo/dashboard/events/${event.id}`,
      })
    }
  }
  const socials = org.socials
  const hasSocials = [socials.instagram, socials.facebook, socials.tiktok, socials.youtube].some(
    (value) => value.trim().length > 0,
  )
  if (!hasSocials) {
    todos.push({
      id: "profil-socials",
      title: "Profil: Social-Links ergänzen",
      href: "/demo/dashboard/profil",
    })
  }
  const openSepa = state.orders.filter(
    (order) => order.orgId === org.id && order.status === "offen" && order.payment.method === "sepa",
  )
  if (openSepa.length > 0) {
    todos.push({
      id: "sepa-offen",
      title: `${openSepa.length} SEPA-Zahlungen offen`,
      href: "/demo/dashboard/bestellungen",
    })
  }
  return todos.slice(0, 5)
}
