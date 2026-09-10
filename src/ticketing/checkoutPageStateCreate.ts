import { getRouteApi } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import { eventFindById } from "../events/eventFindById.ts"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartDraftLoad } from "./ticketCartDraftLoad.ts"
import { ticketCartSearchParse } from "./ticketCartSearchParse.ts"

const routeApi = getRouteApi("/checkout")

type CheckoutItem = {
  readonly event: EventItem
  readonly cart: TicketCart
}

export function checkoutPageStateCreate() {
  const search = routeApi.useSearch()

  const items = createMemo<readonly CheckoutItem[]>(() => {
    const eventId = search().event?.trim() ?? ""
    if (eventId.length > 0) {
      const found = eventFindById(eventId)
      if (!found.success) return []

      return [{ event: found.data, cart: ticketCartSearchParse(eventId, search().tickets ?? "") }]
    }

    const draft = ticketCartDraftLoad()
    const resolved: CheckoutItem[] = []
    for (const cart of draft) {
      const found = eventFindById(cart.eventId)
      if (!found.success) continue
      resolved.push({ event: found.data, cart })
    }
    return resolved
  })

  const groups = createMemo(() => items())
  const hasItems = createMemo(() => items().length > 0)
  const errorMessage = createMemo(() => {
    const eventId = search().event?.trim() ?? ""
    if (eventId.length > 0) {
      const found = eventFindById(eventId)
      if (found.success) return ""
      return "Für diese Bestellung wurde kein Event gefunden. Bitte wähle ein Event neu aus."
    }
    if (hasItems()) return ""
    return "Dein Warenkorb enthält keine gültigen Tickets. Bitte wähle ein Event neu aus."
  })
  const fallbackPath = createMemo<"/" | "/warenkorb">(() => (search().event?.trim() ? "/" : "/warenkorb"))

  return { items, groups, hasItems, errorMessage, fallbackPath }
}
