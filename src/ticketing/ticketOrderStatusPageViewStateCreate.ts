import type { TicketOrderStatusPageState } from "./TicketOrderStatusPageState.ts"
import { ticketOrderStatusPageStateCreate } from "./ticketOrderStatusPageStateCreate.ts"

export function ticketOrderStatusPageViewStateCreate(inputs: {
  orderIds: () => readonly string[]
  checkoutKey: () => string | undefined
  state: () => TicketOrderStatusPageState | undefined
}) {
  const orderState =
    inputs.state() ??
    ticketOrderStatusPageStateCreate({
      orderIds: inputs.orderIds,
      checkoutKey: inputs.checkoutKey,
    })

  const hasOrders = () => orderState.orders().length > 0
  const hasTickets = () => orderState.orders().some((order) => order.tickets.length > 0)
  const hasCancelledOrder = () => orderState.orders().some((order) => Boolean(order.cancellation))
  const hasFailedOrder = () =>
    orderState
      .orders()
      .some(
        (order) =>
          order.paymentStatus === "failed" ||
          order.paymentStatus === "expired" ||
          order.status === "paid_inventory_conflict" ||
          Boolean(order.cancellation),
      )
  const isPaid = () =>
    hasOrders() &&
    orderState
      .orders()
      .every(
        (order) => order.paymentStatus === "paid" && order.status !== "paid_inventory_conflict" && !order.cancellation,
      )
  const isIssuedPending = () =>
    hasOrders() &&
    !isPaid() &&
    !hasCancelledOrder() &&
    orderState.orders().every((order) => order.paymentStatus === "pending" && Boolean(order.ticketsIssuedAt))
  const emailAddress = () => orderState.orders()[0]?.contact.email ?? ""
  const paidOrderReferences = () =>
    orderState
      .orders()
      .filter(
        (order) =>
          (order.paymentStatus === "paid" && order.status === "paid") ||
          Boolean(order.ticketsIssuedAt) ||
          Boolean(order.cancellation),
      )
      .map((order) => {
        if (order.bookingReference) return { label: "Bestellnummer", value: order.bookingReference }
        if (order.billingOrderReference) return { label: "Zahlungsreferenz", value: order.billingOrderReference }
        return { label: "Interne Bestell-ID", value: order.id }
      })

  const confirmationTitle = () => {
    if (isPaid()) return "Vielen Dank – dein Kauf war erfolgreich!"
    if (hasCancelledOrder()) return "Deine Bestellung wurde storniert"
    if (hasFailedOrder()) return "Deine Zahlung konnte nicht abgeschlossen werden"
    if (isIssuedPending()) return "Deine Tickets sind bereit – Zahlung in Bearbeitung"
    return "Deine Bestellung ist eingegangen"
  }

  const confirmationMessage = () => {
    if (isPaid()) {
      return `Die Bestätigung und deine Tickets wurden an ${emailAddress()} gesendet.`
    }
    if (hasCancelledOrder()) {
      return "Die Zahlung für deine Bestellung ist fehlgeschlagen oder wurde zurückgebucht. Die Bestellung wurde storniert und die Tickets sind nicht mehr gültig."
    }
    if (hasFailedOrder()) {
      return "Wir konnten deinen Kauf nicht vollständig abschließen. Bitte prüfe den Status oder versuche es erneut."
    }
    if (isIssuedPending()) {
      return "Deine SEPA-Lastschrift wird verarbeitet. Deine Tickets sind bereits ausgestellt und unten abrufbar. Die Abbuchung erfolgt in Kürze von deinem Bankkonto."
    }
    return "Wir bestätigen deine Zahlung gerade. Sobald sie abgeschlossen ist, stehen deine Tickets hier bereit."
  }

  const confirmationSymbol = () => {
    if (isPaid() || isIssuedPending()) return "✓"
    if (hasFailedOrder()) return "!"
    return "…"
  }

  const confirmationClass = () => {
    return "border-border-subtle bg-surface"
  }

  const confirmationSymbolClass = () => {
    if (isPaid()) return "bg-success text-surface-base"
    if (hasFailedOrder()) return "bg-danger text-surface-base"
    if (isIssuedPending()) return "bg-brand text-brand-content"
    return "bg-brand text-brand-content"
  }

  return {
    ...orderState,
    hasOrders,
    hasTickets,
    hasCancelledOrder,
    hasFailedOrder,
    isPaid,
    isIssuedPending,
    paidOrderReferences,
    confirmationTitle,
    confirmationMessage,
    confirmationSymbol,
    confirmationClass,
    confirmationSymbolClass,
    refreshLabel: () => (orderState.isRefreshing() ? "Status wird aktualisiert …" : "Status aktualisieren"),
  }
}
