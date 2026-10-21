import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import { adminTicketOrderStatusKey } from "./adminTicketOrderStatusKey.ts"

export function adminTicketOrderBookedTicketCount(order: AdminTicketOrderSummary): number {
  const status = adminTicketOrderStatusKey(order)
  if (status !== "bezahlt" && status !== "sepa") return 0
  return order.ticketCount ?? 0
}
