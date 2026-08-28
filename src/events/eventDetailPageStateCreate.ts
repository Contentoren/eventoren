import { getRouteApi } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
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

  const goToCheckout = () => {
    navigate({
      to: "/checkout",
      search: { event: params().eventId, tickets: ticketCartSearchFormat(cart()) || undefined },
    })
  }

  return { event, cart, applyCart, goToCheckout }
}
