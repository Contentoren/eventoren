import { getRouteApi } from "@tanstack/solid-router"
import { createEffect, createMemo, on, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { ApiClientResult } from "../client/apiClient.ts"
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

export function checkoutPageStateCreate(input: {
  getCatalogEvents: (eventKeys: string[]) => Promise<ApiClientResult<readonly EventItem[]>>
}) {
  const search = routeApi.useSearch()
  const catalog = createSignalObject<ApiClientResult<readonly EventItem[]>>({ success: true, data: [] })
  const catalogLoaded = createSignalObject(false)
  const cart = createSignalObject<TicketCartDraft>([])
  const cartLoaded = createSignalObject(false)
  let requestId = 0
  let requestedKeys = ""

  const syncCart = () => {
    const next = ticketCartDraftLoad()
    cart.set(next)
    const eventKey = search().event?.trim()
    const eventKeys = eventKey ? [eventKey] : next.map((entry) => entry.eventId)
    const keys = JSON.stringify(eventKeys)
    if (keys === requestedKeys && catalogLoaded.get() && catalog.get().success) return
    requestedKeys = keys
    const currentRequest = ++requestId
    catalogLoaded.set(false)
    void input.getCatalogEvents(eventKeys).then(
      (result) => {
        if (currentRequest !== requestId) return
        catalog.set(result)
        catalogLoaded.set(true)
      },
      () => {
        if (currentRequest !== requestId) return
        catalog.set({ success: false, error: { status: 503, message: "Catalog request failed" } })
        catalogLoaded.set(true)
      },
    )
  }

  onMount(() => {
    syncCart()
    cartLoaded.set(true)

    if (typeof window === "undefined") return

    window.addEventListener(ticketCartDraftEventName, syncCart)
    window.addEventListener("storage", syncCart)

    onCleanup(() => {
      requestId++
      window.removeEventListener(ticketCartDraftEventName, syncCart)
      window.removeEventListener("storage", syncCart)
    })
  })

  createEffect(
    on(
      () => search().event,
      () => {
        if (cartLoaded.get()) syncCart()
      },
      { defer: true },
    ),
  )

  const items = createMemo<readonly CheckoutItem[]>(() => {
    const catalogResult = catalog.get()
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
  const isReady = createMemo(() => cartLoaded.get() && catalogLoaded.get())
  const hasItems = createMemo(() => items().length > 0)
  const errorMessage = createMemo(() => {
    const text = ticketCheckoutText()
    const catalogResult = catalog.get()
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
