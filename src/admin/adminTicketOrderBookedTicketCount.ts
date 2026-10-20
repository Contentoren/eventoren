import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"

export function adminTicketOrderBookedTicketCount(order: AdminTicketOrderSummary): number {
  if (
    order.cancellation ||
    order.paymentStatus === "failed" ||
    order.paymentStatus === "expired" ||
    order.status === "failed" ||
    order.status === "expired" ||
    order.status === "released"
  )
    return 0
  return order.ticketCount ?? 0
}
