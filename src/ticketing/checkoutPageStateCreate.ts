import { getRouteApi } from "@tanstack/solid-router"
import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import type { TicketCartDraft } from "./TicketCartDraft.ts"
import { ticketCartDraftEventName } from "./ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "./ticketCartDraftLoad.ts"
import { ticketCartForEventResolve } from "./ticketCartForEventResolve.ts"
import { ticketCartSearchParse } from "./ticketCartSearchParse.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"

const routeApi = getRouteApi("/checkout")

type CheckoutItem = {
  readonly event: EventItem
  readonly cart: TicketCart
}

export function checkoutPageStateCreate() {
  const search = routeApi.useSearch()
  const loaderData = routeApi.useLoaderData()
  const catalog = createMemo(() => loaderData().catalog)
  const cart = createSignalObject<TicketCartDraft>([])
  const cartLoaded = createSignalObject(false)

  const syncCart = () => {
    cart.set(ticketCartDraftLoad())
  }

  onMount(() => {
    syncCart()
    cartLoaded.set(true)

    if (typeof window === "undefined") return

    window.addEventListener(ticketCartDraftEventName, syncCart)
    window.addEventListener("storage", syncCart)

    onCleanup(() => {
      window.removeEventListener(ticketCartDraftEventName, syncCart)
      window.removeEventListener("storage", syncCart)
    })
  })

  const items = createMemo<readonly CheckoutItem[]>(() => {
    const catalogResult = catalog()
    if (!catalogResult.success) return []
    const events: readonly EventItem[] = catalogResult.data
    const eventId = search().event?.trim() ?? ""
    if (eventId.length > 0) {
      const event = events.find((candidate: EventItem) => candidate.id === eventId)
      if (!event) return []

      const resolvedCart = ticketCartForEventResolve(event, ticketCartSearchParse(eventId, search().tickets ?? ""))
      if (!resolvedCart) return []
      return [{ event, cart: resolvedCart }]
    }

    const draft = cart.get()
    const resolved: CheckoutItem[] = []
    for (const cart of draft) {
      const event = events.find((candidate: EventItem) => candidate.id === cart.eventId)
      if (!event) continue
      const resolvedCart = ticketCartForEventResolve(event, cart)
      if (!resolvedCart) continue
      resolved.push({ event, cart: resolvedCart })
    }
    return resolved
  })

  const groups = createMemo(() => items())
  const isReady = createMemo(() => Boolean(search().event?.trim()) || cartLoaded.get())
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

  return { items, groups, isReady, hasItems, errorMessage, fallbackPath }
}
