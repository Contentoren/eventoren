import { useNavigate } from "@tanstack/solid-router"
import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventFindById } from "../events/eventFindById.ts"
import type { EventItem } from "../events/EventItem.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import type { TicketBagItem } from "./TicketBagItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartDraftEventName } from "./ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "./ticketCartDraftLoad.ts"
import { ticketCartDraftSave } from "./ticketCartDraftSave.ts"
import { ticketCartEmpty } from "./ticketCartEmpty.ts"
import { ticketCartQuantitySet } from "./ticketCartQuantitySet.ts"
import { ticketCartQuantityTotal } from "./ticketCartQuantityTotal.ts"
import { ticketCartSearchFormat } from "./ticketCartSearchFormat.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketMaxPerOrder } from "./ticketMaxPerOrder.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function ticketBagPageStateCreate() {
  const navigate = useNavigate()
  const [cart, setCart] = createSignal<TicketCart>(ticketCartEmpty(""))

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

  const eventResult = createMemo(() => {
    const current = cart()
    if (!current.eventId) return null
    return eventFindById(current.eventId)
  })

  const event = createMemo<EventItem | null>(() => {
    const result = eventResult()
    if (!result || !result.success) return null
    return result.data
  })

  const totalQuantity = createMemo(() => ticketCartQuantityTotal(cart()))

  const items = createMemo<TicketBagItem[]>(() => {
    const currentEvent = event()
    if (!currentEvent) return []

    const result: TicketBagItem[] = []
    for (const line of cart().lines) {
      const tier = currentEvent.tiers.find((t) => t.id === line.tierId)
      if (!tier || line.quantity <= 0) continue

      const unitPriceCents = tier.priceCents + tier.feeCents
      const totalPriceCents = unitPriceCents * line.quantity

      result.push({
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

    return result
  })

  const totals = createMemo(() => {
    const currentEvent = event()
    if (!currentEvent) {
      return {
        quantity: 0,
        subtotalCents: 0,
        feeCents: 0,
        totalCents: 0,
        subtotalLabel: ticketPriceFormat(0),
        feeLabel: ticketPriceFormat(0),
        totalLabel: ticketPriceFormat(0),
      }
    }

    const calculated = ticketCartTotalCalculate(cart(), currentEvent)
    return {
      ...calculated,
      subtotalLabel: ticketPriceFormat(calculated.subtotalCents),
      feeLabel: ticketPriceFormat(calculated.feeCents),
      totalLabel: ticketPriceFormat(calculated.totalCents),
    }
  })

  const isEmpty = createMemo(() => items().length === 0 || totalQuantity() === 0)

  const eventDateLabel = createMemo(() => {
    const currentEvent = event()
    if (!currentEvent) return ""
    return `${eventDateFormat(currentEvent.startsAt)} · ${eventTimeFormat(currentEvent.startsAt)}`
  })

  const eventLocationLabel = createMemo(() => {
    const currentEvent = event()
    if (!currentEvent) return ""
    return `${currentEvent.venue}, ${currentEvent.city}`
  })

  const updateQuantity = (tierId: string, quantity: number) => {
    const updated = ticketCartQuantitySet(cart(), tierId, quantity)
    setCart(updated)
    ticketCartDraftSave(updated)
  }

  const removeItem = (tierId: string) => {
    updateQuantity(tierId, 0)
  }

  const clearBag = () => {
    const empty = ticketCartEmpty("")
    setCart(empty)
    ticketCartDraftSave(empty)
  }

  const checkout = () => {
    const currentEvent = event()
    if (!currentEvent || isEmpty()) return

    navigate({
      to: "/checkout",
      search: {
        event: currentEvent.id,
        tickets: ticketCartSearchFormat(cart()),
      },
    })
  }

  return {
    cart,
    event,
    eventDateLabel,
    eventLocationLabel,
    items,
    totals,
    totalQuantity,
    isEmpty,
    updateQuantity,
    removeItem,
    clearBag,
    checkout,
  }
}
