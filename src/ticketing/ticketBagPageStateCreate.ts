import { useNavigate } from "@tanstack/solid-router"
import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { ApiClientResult } from "../client/apiClient.ts"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import type { EventItem } from "../events/EventItem.ts"
import { eventTicketTierMaxPerOrderGet } from "../events/eventTicketTierMaxPerOrderGet.ts"
import type { TicketBagGroup } from "./TicketBagGroup.ts"
import type { TicketBagItem } from "./TicketBagItem.ts"
import type { TicketCartDraft } from "./TicketCartDraft.ts"
import { ticketCartForEventResolve } from "./ticketCartForEventResolve.ts"
import { ticketCartDraftEventName } from "./ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "./ticketCartDraftLoad.ts"
import { ticketCartDraftQuantitySet } from "./ticketCartDraftQuantitySet.ts"
import { ticketCartDraftSave } from "./ticketCartDraftSave.ts"
import { ticketCartDraftTotalQuantity } from "./ticketCartDraftTotalQuantity.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function ticketBagPageStateCreate(input: {
  getCatalogEvents: (eventKeys: string[]) => Promise<ApiClientResult<readonly EventItem[]>>
}) {
  const navigate = useNavigate()
  const catalog = createSignalObject<ApiClientResult<readonly EventItem[]>>({ success: true, data: [] })
  const catalogLoaded = createSignalObject(false)
  const cart = createSignalObject<TicketCartDraft>([])
  let requestId = 0
  let requestedKeys = ""

  const syncCart = () => {
    const next = ticketCartDraftLoad()
    cart.set(next)
    const eventKeys = next.map((entry) => entry.eventId)
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

    if (typeof window === "undefined") return

    window.addEventListener(ticketCartDraftEventName, syncCart)
    window.addEventListener("storage", syncCart)

    onCleanup(() => {
      requestId++
      window.removeEventListener(ticketCartDraftEventName, syncCart)
      window.removeEventListener("storage", syncCart)
    })
  })

  const normalizedCart = createMemo<TicketCartDraft>(() => {
    const catalogResult = catalog.get()
    if (!catalogResult.success) return []
    return cart.get().flatMap((currentCart) => {
      const event = catalogResult.data.find((candidate) => candidate.id === currentCart.eventId)
      if (!event) return []
      const resolved = ticketCartForEventResolve(event, currentCart)
      return resolved ? [resolved] : []
    })
  })

  const groups = createMemo<readonly TicketBagGroup[]>(() => {
    const result: TicketBagGroup[] = []
    const catalogResult = catalog.get()

    if (!catalogResult.success) return result

    for (const currentCart of normalizedCart()) {
      const currentEvent = (catalogResult.data as readonly EventItem[]).find(
        (event: EventItem) => event.id === currentCart.eventId,
      )
      if (!currentEvent) continue
      const items: TicketBagItem[] = []

      for (const tier of currentEvent.tiers) {
        const line = currentCart.lines.find((candidate) => candidate.tierId === tier.id)
        if (!line || line.quantity <= 0) continue

        const unitPriceCents = tier.priceCents + tier.feeCents
        const totalPriceCents = unitPriceCents * line.quantity

        items.push({
          tierId: tier.id,
          tierName: tier.name,
          tierDescription: tier.description,
          quantity: line.quantity,
          unitPriceCents,
          unitPriceLabel: ticketPriceFormat(unitPriceCents),
          totalPriceCents,
          totalPriceLabel: ticketPriceFormat(totalPriceCents),
          maxQuantity: Math.min(tier.available, eventTicketTierMaxPerOrderGet(tier)),
        })
      }

      if (items.length === 0) continue

      result.push({
        event: currentEvent,
        eventDateLabel: `${eventDateFormat(currentEvent.startsAt)} · ${eventTimeFormat(currentEvent.startsAt)}`,
        eventLocationLabel: `${currentEvent.venue}, ${currentEvent.city}`,
        items,
      })
    }

    return result
  })

  const totals = createMemo(() => {
    let quantity = 0
    let subtotalCents = 0
    let feeCents = 0

    for (const group of groups()) {
      for (const item of group.items) {
        const tier = group.event.tiers.find((candidate) => candidate.id === item.tierId)
        if (!tier) continue

        quantity += item.quantity
        subtotalCents += tier.priceCents * item.quantity
        feeCents += tier.feeCents * item.quantity
      }
    }

    const totalCents = subtotalCents + feeCents
    return {
      quantity,
      subtotalCents,
      feeCents,
      totalCents,
      subtotalLabel: ticketPriceFormat(subtotalCents),
      feeLabel: ticketPriceFormat(feeCents),
      totalLabel: ticketPriceFormat(totalCents),
    }
  })

  const totalQuantity = createMemo(() => ticketCartDraftTotalQuantity(normalizedCart()))

  const isEmpty = createMemo(() => groups().length === 0 || totalQuantity() === 0)
  const catalogError = createMemo(() => (catalog.get().success ? "" : "Der Eventkatalog ist gerade nicht verfügbar."))

  const updateQuantity = (eventId: string, tierId: string, quantity: number) => {
    const updated = ticketCartDraftQuantitySet(normalizedCart(), eventId, tierId, quantity)
    cart.set(updated)
    ticketCartDraftSave(updated)
  }

  const removeItem = (eventId: string, tierId: string) => {
    updateQuantity(eventId, tierId, 0)
  }

  const clearBag = () => {
    cart.set([])
    ticketCartDraftSave([])
  }

  const checkout = () => {
    if (isEmpty()) return
    navigate({ to: "/checkout" })
  }

  return {
    isReady: catalogLoaded.get,
    groups,
    totals,
    totalQuantity,
    isEmpty,
    catalogError,
    updateQuantity,
    removeItem,
    clearBag,
    checkout,
  }
}
