import { getRouteApi } from "@tanstack/solid-router"
import { createEffect, createMemo } from "solid-js"
import type { TicketCart } from "../ticketing/TicketCart.ts"
import { ticketCartDraftLoad } from "../ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftSave } from "../ticketing/ticketCartDraftSave.ts"
import { ticketCartQuantityTotal } from "../ticketing/ticketCartQuantityTotal.ts"
import { ticketCartSearchFormat } from "../ticketing/ticketCartSearchFormat.ts"
import { ticketCartSearchParse } from "../ticketing/ticketCartSearchParse.ts"
import { eventFindById } from "./eventFindById.ts"
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

  const applyCart = (next: TicketCart, resetScroll = false) => {
    const existing = ticketCartDraftLoad()
    if (existing.eventId === params().eventId) {
      ticketCartDraftSave(next)
    }
    navigate({
      to: "/events/$eventId",
      params: { eventId: params().eventId },
      search: { tickets: ticketCartSearchFormat(next) || undefined },
      replace: true,
      resetScroll,
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

    applyCart({ eventId, lines: [{ tierId: firstAvailableTier.id, quantity: 1 }] }, true)
  })

  const checkConflictingCart = (): boolean => {
    if (typeof window === "undefined") return true
    const existing = ticketCartDraftLoad()
    const existingQty = ticketCartQuantityTotal(existing)
    if (existing.eventId && existing.eventId !== cart().eventId && existingQty > 0) {
      const existingEvent = eventFindById(existing.eventId)
      const existingName = existingEvent.success ? existingEvent.data.title : "ein anderes Event"
      return window.confirm(
        `Dein Warenkorb enthält bereits ${existingQty} Ticket(s) für „${existingName}“.\n\nPro Buchung kann jeweils ein Event gebucht werden. Möchtest du deinen bisherigen Warenkorb durch „${event().title}“ ersetzen?`,
      )
    }
    return true
  }

  const goToCart = () => {
    if (!checkConflictingCart()) return
    ticketCartDraftSave(cart())
    navigate({
      to: "/warenkorb",
    })
  }

  const goToCheckout = () => {
    if (!checkConflictingCart()) return
    ticketCartDraftSave(cart())
    navigate({
      to: "/checkout",
      search: { event: params().eventId, tickets: ticketCartSearchFormat(cart()) || undefined },
    })
  }

  return { event, cart, applyCart, goToCart, goToCheckout }
}
