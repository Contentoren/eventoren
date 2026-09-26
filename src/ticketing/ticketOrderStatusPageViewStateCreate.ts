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
  const hasFailedOrder = () =>
    orderState
      .orders()
      .some(
        (order) =>
          order.paymentStatus === "failed" ||
          order.paymentStatus === "expired" ||
          order.status === "paid_inventory_conflict",
      )
  const isPaid = () =>
    hasOrders() &&
    orderState.orders().every((order) => order.paymentStatus === "paid" && order.status !== "paid_inventory_conflict")
  const emailAddress = () => orderState.orders()[0]?.contact.email ?? ""
  const paidOrderReferences = () =>
    orderState
      .orders()
      .filter((order) => order.paymentStatus === "paid" && order.status === "paid")
      .map((order) => {
        if (order.bookingReference) return { label: "Bestellnummer", value: order.bookingReference }
        if (order.billingOrderReference) return { label: "Zahlungsreferenz", value: order.billingOrderReference }
        return { label: "Interne Bestell-ID", value: order.id }
      })

  const confirmationTitle = () => {
    if (isPaid()) return "Vielen Dank – dein Kauf war erfolgreich!"
    if (hasFailedOrder()) return "Deine Zahlung konnte nicht abgeschlossen werden"
    return "Deine Bestellung ist eingegangen"
  }

  const confirmationMessage = () => {
    if (isPaid()) {
      return `Die Bestätigung und deine Tickets wurden an ${emailAddress()} gesendet.`
    }
    if (hasFailedOrder()) {
      return "Wir konnten deinen Kauf nicht vollständig abschließen. Bitte prüfe den Status oder versuche es erneut."
    }
    return "Wir bestätigen deine Zahlung gerade. Sobald sie abgeschlossen ist, stehen deine Tickets hier bereit."
  }

  const confirmationSymbol = () => {
    if (isPaid()) return "✓"
    if (hasFailedOrder()) return "!"
    return "…"
  }

  const confirmationClass = () => {
    return "border-border-subtle bg-surface"
  }

  const confirmationSymbolClass = () => {
    if (isPaid()) return "bg-success text-surface-base"
    if (hasFailedOrder()) return "bg-danger text-surface-base"
    return "bg-brand text-brand-content"
  }

  return {
    ...orderState,
    hasOrders,
    hasTickets,
    hasFailedOrder,
    isPaid,
    paidOrderReferences,
    confirmationTitle,
    confirmationMessage,
    confirmationSymbol,
    confirmationClass,
    confirmationSymbolClass,
    refreshLabel: () => (orderState.isRefreshing() ? "Status wird aktualisiert …" : "Status aktualisieren"),
  }
}
