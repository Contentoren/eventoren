import { useNavigate } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import type { EventItem } from "../../events/EventItem.ts"
import { eventDateFormat } from "../../events/eventDateFormat.ts"
import { eventTimeFormat } from "../../events/eventTimeFormat.ts"
import type { TicketBagGroup } from "../../ticketing/TicketBagGroup.ts"
import type { TicketBagItem } from "../../ticketing/TicketBagItem.ts"
import type { TicketCartDraft } from "../../ticketing/TicketCartDraft.ts"
import { ticketMaxPerOrder } from "../../ticketing/ticketMaxPerOrder.ts"
import { ticketCartDraftQuantitySet } from "../../ticketing/ticketCartDraftQuantitySet.ts"
import { ticketPriceFormat } from "../../ticketing/ticketPriceFormat.ts"
import { demoCartStore } from "./demoCartStore.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function demoCartPageStateCreate(inputs: { events: readonly EventItem[]; empty?: boolean }) {
  const navigate = useNavigate()
  const localDraft = inputs.empty ? createSignalObject<TicketCartDraft>([]) : undefined
  const currentDraft = () => localDraft?.get() ?? demoCartStore.draft()
  const updateQuantity = (eventId: string, tierId: string, quantity: number) => {
    if (localDraft) {
      localDraft.set(ticketCartDraftQuantitySet(currentDraft(), eventId, tierId, quantity))
      return
    }
    demoCartStore.updateQuantity(eventId, tierId, quantity)
  }

  const groups = createMemo<readonly TicketBagGroup[]>(() => {
    const result: TicketBagGroup[] = []
    for (const currentCart of currentDraft()) {
      const event = demoCartStore.eventFind(currentCart.eventId, inputs.events)
      if (!event) continue
      const items: TicketBagItem[] = []

      for (const tier of event.tiers) {
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
        event,
        eventDateLabel: `${eventDateFormat(event.startsAt)} · ${eventTimeFormat(event.startsAt)}`,
        eventLocationLabel: `${event.venue}, ${event.city}`,
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
    return {
      quantity,
      subtotalCents,
      feeCents,
      totalCents: subtotalCents + feeCents,
      subtotalLabel: ticketPriceFormat(subtotalCents),
      feeLabel: ticketPriceFormat(feeCents),
      totalLabel: ticketPriceFormat(subtotalCents + feeCents),
    }
  })

  const totalQuantity = () => totals().quantity
  const isEmpty = createMemo(() => groups().length === 0 || totalQuantity() === 0)

  return {
    groups,
    totals,
    totalQuantity,
    isEmpty,
    catalogError: () => "",
    updateQuantity,
    removeItem: (eventId: string, tierId: string) => updateQuantity(eventId, tierId, 0),
    clearBag: () => {
      if (localDraft) {
        localDraft.set([])
        return
      }
      demoCartStore.clear()
    },
    checkout: () => {
      if (!isEmpty()) navigate({ to: "/demo/checkout" })
    },
  }
}
