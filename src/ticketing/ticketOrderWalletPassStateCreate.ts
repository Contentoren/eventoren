import type { BadgeVariant } from "#ui/static/badge/badgeCva.jsx"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
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

  const statusVariant = (): BadgeVariant => {
    if (inputs.order().status === "paid_inventory_conflict") return "filledYellow"
    if (inputs.order().paymentStatus === "paid") return "filledGreen"
    if (inputs.order().paymentStatus === "pending") return "filledYellow"
    return "filledRed"
  }

  const participantName = (ticket: TicketOrderProjection["tickets"][number]) =>
    ticket.participantName ?? `${inputs.order().contact.givenName} ${inputs.order().contact.familyName} (Käufer:in)`

  const ticketsUnavailableMessage = () => {
    if (inputs.order().paymentStatus === "pending") {
      return "Deine Tickets erscheinen hier automatisch, sobald die Zahlung bestätigt ist."
    }
    return "Für diese Bestellung sind aktuell keine Tickets verfügbar."
  }

  return {
    order: inputs.order,
    orderReference: () => inputs.order().billingOrderReference ?? inputs.order().paymentReference ?? inputs.order().id,
    dateTime: () =>
      `${eventDateFormat(inputs.order().eventStartsAt)} · ${eventTimeFormat(inputs.order().eventStartsAt)}`,
    total: () => ticketPriceFormat(inputs.order().totalCents),
    ticketCountLabel: () =>
      `${inputs.order().tickets.length} ${inputs.order().tickets.length === 1 ? "Ticket" : "Tickets"}`,
    ticketTitle: (ticket: TicketOrderProjection["tickets"][number]) => `Ticket ${ticket.sequence} · ${ticket.tierName}`,
    ticketQrLabel: (ticket: TicketOrderProjection["tickets"][number]) => `QR-Code für Ticket ${ticket.sequence}`,
    statusLabel,
    statusVariant,
    participantName,
    ticketsUnavailableMessage,
  }
}
