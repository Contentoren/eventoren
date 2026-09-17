import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketBagGroup } from "./TicketBagGroup.ts"
import type { TicketBagItem } from "./TicketBagItem.ts"
import type { TicketCartDraft } from "./TicketCartDraft.ts"
import { ticketCartDraftEventName } from "./ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "./ticketCartDraftLoad.ts"
import { ticketCartDraftQuantitySet } from "./ticketCartDraftQuantitySet.ts"
import { ticketCartDraftSave } from "./ticketCartDraftSave.ts"
import { ticketCartDraftTotalQuantity } from "./ticketCartDraftTotalQuantity.ts"
import { ticketMaxPerOrder } from "./ticketMaxPerOrder.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function ticketBagPageStateCreate() {
  const navigate = useNavigate()
  const routeApi = getRouteApi("/warenkorb")
  const catalog = routeApi.useLoaderData()
  const [cart, setCart] = createSignal<TicketCartDraft>([])

  const syncCart = () => {
    setCart(ticketCartDraftLoad())
  }

  onMount(() => {
    syncCart()

    if (typeof window === "undefined") return

    window.addEventListener(ticketCartDraftEventName, syncCart)
    window.addEventListener("storage", syncCart)

    onCleanup(() => {
      window.removeEventListener(ticketCartDraftEventName, syncCart)
      window.removeEventListener("storage", syncCart)
    })
  })

  const groups = createMemo<readonly TicketBagGroup[]>(() => {
    const result: TicketBagGroup[] = []
    const catalogResult = catalog()

    if (!catalogResult.success) return result

    for (const currentCart of cart()) {
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
          maxQuantity: Math.min(tier.available, ticketMaxPerOrder),
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

  const totalQuantity = createMemo(() => ticketCartDraftTotalQuantity(cart()))

  const isEmpty = createMemo(() => groups().length === 0 || totalQuantity() === 0)
  const catalogError = createMemo(() => (catalog().success ? "" : "Der Eventkatalog ist gerade nicht verfügbar."))

  const updateQuantity = (eventId: string, tierId: string, quantity: number) => {
    const updated = ticketCartDraftQuantitySet(cart(), eventId, tierId, quantity)
    setCart(updated)
    ticketCartDraftSave(updated)
  }

  const removeItem = (eventId: string, tierId: string) => {
    updateQuantity(eventId, tierId, 0)
  }

  const clearBag = () => {
    setCart([])
    ticketCartDraftSave([])
  }

  const checkout = () => {
    if (isEmpty()) return
    navigate({ to: "/checkout" })
  }

  return {
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
