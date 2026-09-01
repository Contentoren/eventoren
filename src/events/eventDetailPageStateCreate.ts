import { getRouteApi } from "@tanstack/solid-router"
import { createEffect, createMemo } from "solid-js"
import type { TicketCart } from "../ticketing/TicketCart.ts"
import { ticketCartDraftSave } from "../ticketing/ticketCartDraftSave.ts"
import { ticketCartSearchFormat } from "../ticketing/ticketCartSearchFormat.ts"
import { ticketCartSearchParse } from "../ticketing/ticketCartSearchParse.ts"
import type { EventItem } from "./EventItem.ts"

const routeApi = getRouteApi("/events/$eventId")

export function eventDetailPageStateCreate() {
  const search = routeApi.useSearch()
  const params = routeApi.useParams()
  const loaderData = routeApi.useLoaderData()
  const navigate = routeApi.useNavigate()

  const event = createMemo<EventItem>(() => loaderData())
  const cart = createMemo(() => ticketCartSearchParse(params().eventId, search().tickets ?? ""))

  let initializedEventId = ""

  const applyCart = (next: TicketCart) => {
    ticketCartDraftSave(next)
    navigate({
      to: "/events/$eventId",
      params: { eventId: params().eventId },
      search: { tickets: ticketCartSearchFormat(next) || undefined },
      replace: true,
      resetScroll: false,
    })
  }

  createEffect(() => {
    const currentEvent = event()
    const eventId = params().eventId
    if (initializedEventId === eventId) return
    initializedEventId = eventId

    const hasValidSelection = cart().lines.some((line) => currentEvent.tiers.some((tier) => tier.id === line.tierId))
    if (hasValidSelection) return

    const firstAvailableTier = currentEvent.tiers.find((tier) => tier.available > 0)
    if (!firstAvailableTier) return

    applyCart({ eventId, lines: [{ tierId: firstAvailableTier.id, quantity: 1 }] })
  })

  const goToCart = () => {
    ticketCartDraftSave(cart())
    navigate({
      to: "/warenkorb",
    })
  }

  const goToCheckout = () => {
    ticketCartDraftSave(cart())
    navigate({
      to: "/checkout",
      search: { event: params().eventId, tickets: ticketCartSearchFormat(cart()) || undefined },
    })
  }

  return { event, cart, applyCart, goToCart, goToCheckout }
}
