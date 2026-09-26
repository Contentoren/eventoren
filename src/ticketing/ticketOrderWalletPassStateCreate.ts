import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import type { UiBadge } from "../ui/UiBadge.tsx"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function ticketOrderWalletPassStateCreate(inputs: { order: () => TicketOrderProjection }) {
  const statusLabel = () => {
    if (inputs.order().status === "paid_inventory_conflict") return "Prüfung erforderlich"
    if (inputs.order().paymentStatus === "paid") return "Bezahlt"
    if (inputs.order().paymentStatus === "pending") return "Wird bestätigt"
    if (inputs.order().paymentStatus === "expired") return "Abgelaufen"
    return "Fehlgeschlagen"
  }

  const statusTone = (): Parameters<typeof UiBadge>[0]["tone"] => {
    if (inputs.order().status === "paid_inventory_conflict") return "warning"
    if (inputs.order().paymentStatus === "paid") return "success"
    if (inputs.order().paymentStatus === "pending") return "brand"
    return "danger"
  }

  const participantName = (ticket: TicketOrderProjection["tickets"][number]) =>
    ticket.participantName ?? `${inputs.order().contact.givenName} ${inputs.order().contact.familyName} (Käufer:in)`

  const ticketsUnavailableMessage = () => {
    if (inputs.order().paymentStatus === "pending") {
      return "Deine Tickets erscheinen hier automatisch, sobald die Zahlung bestätigt ist."
    }
    return "Für diese Bestellung sind aktuell keine Tickets verfügbar."
  }

  const orderReferenceDisplay = () => {
    const order = inputs.order()
    if (order.paymentStatus !== "paid" || order.status !== "paid") return undefined
    if (order.bookingReference) return { label: "Bestellnummer", value: order.bookingReference }
    if (order.billingOrderReference) return { label: "Zahlungsreferenz", value: order.billingOrderReference }
    return { label: "Interne Bestell-ID", value: order.id }
  }

  return {
    order: inputs.order,
    orderReferenceDisplay,
    dateTime: () =>
      `${eventDateFormat(inputs.order().eventStartsAt)} · ${eventTimeFormat(inputs.order().eventStartsAt)}`,
    total: () => ticketPriceFormat(inputs.order().totalCents),
    ticketCountLabel: () =>
      `${inputs.order().tickets.length} ${inputs.order().tickets.length === 1 ? "Ticket" : "Tickets"}`,
    ticketTitle: (ticket: TicketOrderProjection["tickets"][number]) => `Ticket ${ticket.sequence} · ${ticket.tierName}`,
    ticketQrLabel: (ticket: TicketOrderProjection["tickets"][number]) => `QR-Code für Ticket ${ticket.sequence}`,
    statusLabel,
    statusTone,
    participantName,
    ticketsUnavailableMessage,
  }
}
