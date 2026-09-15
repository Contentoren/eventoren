import { createMemo } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { eventPriceFrom } from "../events/eventPriceFrom.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketTierSelectorStateCreate } from "./ticketTierSelectorStateCreate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"

export function ticketCartSummaryStateCreate(inputs: {
  event: () => EventItem
  cart: () => TicketCart
  minimumQuantity?: () => number | undefined
  onCartChange?: (cart: TicketCart) => void
}) {
  const minimumQuantity = () => inputs.minimumQuantity?.() ?? 0

  const selectorState = ticketTierSelectorStateCreate({
    event: inputs.event,
    cart: inputs.cart,
    onCartChange: (cart) => inputs.onCartChange?.(cart),
  })

  const total = createMemo(() => ticketCartTotalCalculate(inputs.cart(), inputs.event()))

  const rows = createMemo(() =>
    inputs.cart().lines.flatMap((line) => {
      const tier = inputs.event().tiers.find((candidate) => candidate.id === line.tierId)
      const selectorRow = selectorState.rows().find((candidate) => candidate.id === line.tierId)
      if (!tier || !selectorRow) return []
      return [
        {
          id: tier.id,
          name: tier.name,
          quantity: line.quantity,
          label: `${line.quantity} × ${tier.name}`,
          unitPriceLabel: `${ticketPriceFormat(tier.priceCents)} ${ticketCheckoutText().perTicket}`,
          priceLabel: ticketPriceFormat(tier.priceCents * line.quantity),
          canDecrease: selectorRow.canDecrease && line.quantity > minimumQuantity(),
          canIncrease: selectorRow.canIncrease,
        },
      ]
    }),
  )

  const isEmpty = createMemo(() => total().quantity === 0)
  const subtotalLabel = createMemo(() => ticketPriceFormat(total().subtotalCents))
  const feeLabel = createMemo(() => ticketPriceFormat(total().feeCents))
  const totalLabel = createMemo(() => ticketPriceFormat(total().totalCents))
  const fromPriceLabel = createMemo(
    () => `${ticketCheckoutText().fromPrice} ${ticketPriceFormat(eventPriceFrom(inputs.event()))}`,
  )

  const quantityLabel = createMemo(() =>
    isEmpty()
      ? `0 ${ticketCheckoutText().ticketsSelected}`
      : `${total().quantity} ${total().quantity === 1 ? "Ticket" : ticketCheckoutText().tickets}`,
  )

  const isCheckoutDisabled = createMemo(() => isEmpty() || inputs.event().soldOut)
  const canChangeCart = () => inputs.onCartChange !== undefined

  const increaseTier = (tierId: string) => selectorState.increaseTier(tierId)
  const decreaseTier = (tierId: string) => {
    const row = rows().find((candidate) => candidate.id === tierId)
    if (!row || row.quantity <= minimumQuantity()) return
    selectorState.decreaseTier(tierId)
  }

  return {
    rows,
    isEmpty,
    subtotalLabel,
    feeLabel,
    totalLabel,
    fromPriceLabel,
    quantityLabel,
    isCheckoutDisabled,
    canChangeCart,
    increaseTier,
    decreaseTier,
    total,
  }
}
