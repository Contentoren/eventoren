import { createMemo } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { eventTicketTierMaxPerOrderGet } from "../events/eventTicketTierMaxPerOrderGet.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartQuantityOf } from "./ticketCartQuantityOf.ts"
import { ticketCartQuantitySet } from "./ticketCartQuantitySet.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function ticketTierSelectorStateCreate(inputs: {
  event: () => EventItem
  cart: () => TicketCart
  onCartChange: (cart: TicketCart) => void
}) {
  const total = createMemo(() => ticketCartTotalCalculate(inputs.cart(), inputs.event()))

  const rows = createMemo(() =>
    inputs.event().tiers.map((tier) => {
      const quantity = ticketCartQuantityOf(inputs.cart(), tier.id)
      const maxQuantity = Math.max(0, Math.min(tier.available, eventTicketTierMaxPerOrderGet(tier)))
      return {
        id: tier.id,
        name: tier.name,
        description: tier.description,
        priceLabel: ticketPriceFormat(tier.priceCents),
        totalLabel: `${ticketPriceFormat(tier.priceCents + tier.feeCents)} pro Ticket inkl. Gebühren`,
        soldOut: tier.available === 0,
        quantity,
        maxQuantity,
        canDecrease: quantity > 0,
        canIncrease: quantity < maxQuantity,
      }
    }),
  )

  const quantityChange = (tierId: string, delta: number) => {
    const row = rows().find((candidate) => candidate.id === tierId)
    if (!row) return
    const next = Math.max(0, Math.min(row.maxQuantity, row.quantity + delta))
    if (next === row.quantity) return
    inputs.onCartChange(ticketCartQuantitySet(inputs.cart(), tierId, next))
  }

  const increaseTier = (tierId: string) => quantityChange(tierId, 1)
  const decreaseTier = (tierId: string) => quantityChange(tierId, -1)

  const hintLabel = createMemo(() => {
    const limits = inputs.event().tiers.map((tier) => eventTicketTierMaxPerOrderGet(tier))
    const distinct = [...new Set(limits)]
    const perProduct =
      distinct.length === 1
        ? `Maximal ${distinct[0]} Tickets je Produkt pro Bestellung.`
        : "Je Produkt gilt das jeweilige Bestelllimit."
    const capped = total().quantity > 0 && rows().every((row) => row.quantity >= row.maxQuantity || row.soldOut)
    return capped ? `${perProduct} Limit erreicht.` : perProduct
  })

  const selectionLabel = createMemo(() =>
    total().quantity === 0 ? "Keine Tickets ausgewählt" : `${total().quantity} Tickets ausgewählt`,
  )

  return { rows, total, increaseTier, decreaseTier, hintLabel, selectionLabel }
}
