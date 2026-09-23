import { getRouteApi } from "@tanstack/solid-router"
import { createEffect, createMemo, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketCart } from "../ticketing/TicketCart.ts"
import { ticketCartDraftAddOrUpdate } from "../ticketing/ticketCartDraftAddOrUpdate.ts"
import { ticketCartDraftLoad } from "../ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftSave } from "../ticketing/ticketCartDraftSave.ts"
import { ticketCartSearchFormat } from "../ticketing/ticketCartSearchFormat.ts"
import { ticketCartSearchParse } from "../ticketing/ticketCartSearchParse.ts"
import type { EventItem } from "./EventItem.ts"

const routeApi = getRouteApi("/events/$eventId")

export function eventDetailPageStateCreate(inputs: { event: () => EventItem }) {
  const search = routeApi.useSearch()
  const params = routeApi.useParams()
  const navigate = routeApi.useNavigate()

  const event = createMemo(() => inputs.event())
  const cart = createMemo(() => ticketCartSearchParse(params().eventId, search().tickets ?? ""))
  const hydrated = createSignalObject(false)

  let initializedEventId = ""

  const applyCart = (next: TicketCart, resetScroll = false) => {
    const existing = ticketCartDraftLoad()
    if (existing.some((entry) => entry.eventId === params().eventId)) {
      const updated = ticketCartDraftAddOrUpdate(existing, next)
      ticketCartDraftSave(updated)
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

  onMount(() => hydrated.set(true))

  const goToCart = () => {
    const existing = ticketCartDraftLoad()
    const updated = ticketCartDraftAddOrUpdate(existing, cart())
    ticketCartDraftSave(updated)
    navigate({
      to: "/warenkorb",
    })
  }

  const goToCheckout = () => {
    const existing = ticketCartDraftLoad()
    const updated = ticketCartDraftAddOrUpdate(existing, cart())
    ticketCartDraftSave(updated)
    navigate({
      to: "/checkout",
      search: { event: params().eventId, tickets: ticketCartSearchFormat(cart()) || undefined },
    })
  }

  return { event, cart, hydrated: hydrated.get, applyCart, goToCart, goToCheckout }
}
