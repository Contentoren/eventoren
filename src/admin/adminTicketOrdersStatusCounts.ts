import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import { type AdminTicketOrderStatusFilter, adminTicketOrderStatusKey } from "./adminTicketOrderStatusKey.ts"

type AdminTicketOrderStatusSource = Pick<AdminTicketOrderSummary, "paymentStatus" | "ticketsIssuedAt" | "cancellation">

/** Zählt Bestellungen je Status-Chip, "alle" zählt die Basis ohne Status-Filter. */
export function adminTicketOrdersStatusCounts(
  orders: readonly AdminTicketOrderStatusSource[],
): Record<AdminTicketOrderStatusFilter, number> {
  const counts: Record<AdminTicketOrderStatusFilter, number> = {
    alle: orders.length,
    bezahlt: 0,
    offen: 0,
    sepa: 0,
    fehlgeschlagen: 0,
    abgelaufen: 0,
    storniert: 0,
  }
  for (const order of orders) {
    counts[adminTicketOrderStatusKey(order)] += 1
  }
  return counts
}
