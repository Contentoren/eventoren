import { getRouteApi } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartDraftLoad } from "./ticketCartDraftLoad.ts"
import { ticketCartSearchParse } from "./ticketCartSearchParse.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"

const routeApi = getRouteApi("/checkout")

type CheckoutItem = {
  readonly event: EventItem
  readonly cart: TicketCart
}

export function checkoutPageStateCreate() {
  const search = routeApi.useSearch()
  const catalog = routeApi.useLoaderData()

  const items = createMemo<readonly CheckoutItem[]>(() => {
    const catalogResult = catalog()
    if (!catalogResult.success) return []
    const events: readonly EventItem[] = catalogResult.data
    const eventId = search().event?.trim() ?? ""
    if (eventId.length > 0) {
      const event = events.find((candidate: EventItem) => candidate.id === eventId)
      if (!event) return []

      return [{ event, cart: ticketCartSearchParse(eventId, search().tickets ?? "") }]
    }

    const draft = ticketCartDraftLoad()
    const resolved: CheckoutItem[] = []
    for (const cart of draft) {
      const event = events.find((candidate: EventItem) => candidate.id === cart.eventId)
      if (!event) continue
      resolved.push({ event, cart })
    }
    return resolved
  })

  const groups = createMemo(() => items())
  const hasItems = createMemo(() => items().length > 0)
  const errorMessage = createMemo(() => {
    const text = ticketCheckoutText()
    const catalogResult = catalog()
    const eventId = search().event?.trim() ?? ""
    if (eventId.length > 0) {
      if (catalogResult.success && catalogResult.data.some((event: EventItem) => event.id === eventId)) return ""
      if (!catalogResult.success) return text.catalogUnavailable
      return text.eventNotFound
    }
    if (!catalogResult.success) return text.catalogUnavailable
    if (hasItems()) return ""
    return text.noValidTickets
  })
  const fallbackPath = createMemo<"/" | "/warenkorb">(() => (search().event?.trim() ? "/" : "/warenkorb"))

  return { items, groups, hasItems, errorMessage, fallbackPath }
}
