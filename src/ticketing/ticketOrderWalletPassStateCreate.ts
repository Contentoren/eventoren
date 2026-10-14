import { createSignal } from "solid-js"
import { envAppleWalletEnabled } from "#src/app/env/public/envAppleWalletEnabled.ts"
import { envGoogleWalletEnabled } from "#src/app/env/public/envGoogleWalletEnabled.ts"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import type { UiBadge } from "../ui/UiBadge.tsx"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function ticketOrderWalletPassStateCreate(inputs: { order: () => TicketOrderProjection }) {
  const [selectedWalletType, setSelectedWalletType] = createSignal<"apple" | "google" | null>(null)
  const [selectedTicket, setSelectedTicket] = createSignal<TicketOrderProjection["tickets"][number] | null>(null)

  const openAppleWallet = (ticket: TicketOrderProjection["tickets"][number]) => {
    setSelectedWalletType("apple")
    setSelectedTicket(ticket)
  }

  const openGoogleWallet = (ticket: TicketOrderProjection["tickets"][number]) => {
    setSelectedWalletType("google")
    setSelectedTicket(ticket)
  }

  const closeWalletDialog = () => {
    setSelectedWalletType(null)
    setSelectedTicket(null)
  }

  const statusLabel = () => {
    if (inputs.order().cancellation) return "Storniert"
    if (inputs.order().status === "paid_inventory_conflict") return "Prüfung erforderlich"
    if (inputs.order().paymentStatus === "paid") return "Bezahlt"
    if (inputs.order().paymentStatus === "pending") {
      if (inputs.order().ticketsIssuedAt) return "SEPA in Bearbeitung"
      return "Wird bestätigt"
    }
    if (inputs.order().paymentStatus === "expired") return "Abgelaufen"
    return "Fehlgeschlagen"
  }

  const statusTone = (): Parameters<typeof UiBadge>[0]["tone"] => {
    if (inputs.order().cancellation) return "danger"
    if (inputs.order().status === "paid_inventory_conflict") return "warning"
    if (inputs.order().paymentStatus === "paid") return "success"
    if (inputs.order().paymentStatus === "pending") return "brand"
    return "danger"
  }

  const participantName = (ticket: TicketOrderProjection["tickets"][number]) =>
    ticket.participantName ?? `${inputs.order().contact.givenName} ${inputs.order().contact.familyName} (Käufer:in)`

  const ticketsUnavailableMessage = () => {
    if (inputs.order().cancellation) {
      return "Diese Bestellung wurde storniert. Es sind keine gültigen Tickets verfügbar."
    }
    if (inputs.order().paymentStatus === "pending") {
      return "Deine Tickets erscheinen hier automatisch, sobald die Zahlung bestätigt ist."
    }
    return "Für diese Bestellung sind aktuell keine Tickets verfügbar."
  }

  const orderReferenceDisplay = () => {
    const order = inputs.order()
    if (
      order.status === "paid_inventory_conflict" ||
      (order.paymentStatus !== "paid" && !order.ticketsIssuedAt && !order.cancellation)
    ) {
      return undefined
    }
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
    selectedWalletType,
    selectedTicket,
    openAppleWallet,
    openGoogleWallet,
    closeWalletDialog,
    isAppleWalletAvailable: (ticket: TicketOrderProjection["tickets"][number]) =>
      envAppleWalletEnabled() || Boolean(ticket.appleWalletPassUrl),
    isGoogleWalletAvailable: (ticket: TicketOrderProjection["tickets"][number]) =>
      envGoogleWalletEnabled() || Boolean(ticket.googleWalletSaveUrl),
  }
}
