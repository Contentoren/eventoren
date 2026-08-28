import { createMemo } from "solid-js"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import { ticketPaymentMethodLabel } from "./ticketPaymentMethodLabel.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function ticketWalletPassStateCreate(inputs: { order: () => TicketOrder }) {
  const dateLabel = createMemo(() => eventDateFormat(inputs.order().eventStartsAt))
  const timeLabel = createMemo(() => eventTimeFormat(inputs.order().eventStartsAt))
  const doorsLabel = createMemo(() => `Einlass ab ${eventTimeFormat(inputs.order().eventDoorsAt)}`)
  const locationLabel = createMemo(() => `${inputs.order().venue}, ${inputs.order().city}`)
  const holderLabel = createMemo(() => `${inputs.order().contact.firstName} ${inputs.order().contact.lastName}`)
  const totalLabel = createMemo(() => ticketPriceFormat(inputs.order().total.totalCents))
  const paymentMethod = createMemo(() => inputs.order().paymentMethod)
  const paymentLabel = createMemo(() => ticketPaymentMethodLabel(inputs.order().paymentMethod))

  const quantityLabel = createMemo(() => {
    const quantity = inputs.order().total.quantity
    return `${quantity} ${quantity === 1 ? "Ticket" : "Tickets"}`
  })

  const lineLabels = createMemo(() =>
    inputs.order().lines.map((line) => ({
      id: line.tierId,
      label: `${line.quantity} × ${line.tierName}`,
      priceLabel: ticketPriceFormat((line.priceCents + line.feeCents) * line.quantity),
    })),
  )

  const qrValue = createMemo(() => inputs.order().code)
  const qrLabel = createMemo(() => `QR-Code für Bestellung ${inputs.order().code} – am Einlass scannen lassen`)

  return {
    dateLabel,
    timeLabel,
    doorsLabel,
    locationLabel,
    holderLabel,
    totalLabel,
    paymentMethod,
    paymentLabel,
    quantityLabel,
    lineLabels,
    qrValue,
    qrLabel,
  }
}
