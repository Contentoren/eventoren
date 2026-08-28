import { createMemo } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventPriceFrom } from "../events/eventPriceFrom.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

const trustBadges = [
  "Sofortiger digitaler Wallet-Pass",
  "100% Einlass-Garantie",
  "Sichere Zahlung – keine versteckten Kosten",
] as const

export function ticketCartSummaryStateCreate(inputs: { event: () => EventItem; cart: () => TicketCart }) {
  const total = createMemo(() => ticketCartTotalCalculate(inputs.cart(), inputs.event()))

  const rows = createMemo(() =>
    inputs.cart().lines.flatMap((line) => {
      const tier = inputs.event().tiers.find((candidate) => candidate.id === line.tierId)
      if (!tier) return []
      return [
        {
          id: tier.id,
          label: `${line.quantity} × ${tier.name}`,
          unitPriceLabel: `${ticketPriceFormat(tier.priceCents)} pro Ticket`,
          priceLabel: ticketPriceFormat(tier.priceCents * line.quantity),
        },
      ]
    }),
  )

  const isEmpty = createMemo(() => total().quantity === 0)
  const subtotalLabel = createMemo(() => ticketPriceFormat(total().subtotalCents))
  const feeLabel = createMemo(() => ticketPriceFormat(total().feeCents))
  const totalLabel = createMemo(() => ticketPriceFormat(total().totalCents))
  const fromPriceLabel = createMemo(() => `ab ${ticketPriceFormat(eventPriceFrom(inputs.event()))}`)

  const title = createMemo(() => inputs.event().title)
  const dateLabel = createMemo(
    () => `${eventDateFormat(inputs.event().startsAt)} · ${eventTimeFormat(inputs.event().startsAt)}`,
  )
  const locationLabel = createMemo(() => `${inputs.event().venue}, ${inputs.event().city}`)

  const quantityLabel = createMemo(() =>
    isEmpty() ? "Noch keine Tickets gewählt" : `${total().quantity} ${total().quantity === 1 ? "Ticket" : "Tickets"}`,
  )

  const isCheckoutDisabled = createMemo(() => isEmpty() || inputs.event().soldOut)

  return {
    rows,
    isEmpty,
    subtotalLabel,
    feeLabel,
    totalLabel,
    fromPriceLabel,
    title,
    dateLabel,
    locationLabel,
    quantityLabel,
    isCheckoutDisabled,
    trustBadges: () => trustBadges,
    total,
  }
}
