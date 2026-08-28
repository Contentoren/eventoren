import { createMemo } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function ticketStickyCtaStateCreate(inputs: { event: () => EventItem; cart: () => TicketCart }) {
  const total = createMemo(() => ticketCartTotalCalculate(inputs.cart(), inputs.event()))

  const isEmpty = createMemo(() => total().quantity === 0)

  const quantityLabel = createMemo(() =>
    isEmpty() ? "Noch keine Tickets" : `${total().quantity} ${total().quantity === 1 ? "Ticket" : "Tickets"}`,
  )

  const totalLabel = createMemo(() =>
    isEmpty() ? "Tickets auswählen" : `${ticketPriceFormat(total().totalCents)} inkl. Gebühren`,
  )

  const isDisabled = createMemo(() => isEmpty() || inputs.event().soldOut)

  return { quantityLabel, totalLabel, isDisabled, isEmpty, total }
}
