import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import { adminTicketOrderBookingReference } from "./adminTicketOrderBookingReference.ts"
import { adminTicketOrderStatusKey } from "./adminTicketOrderStatusKey.ts"
import { adminTicketOrderStatusLabel } from "./adminTicketOrderStatusLabel.ts"

export type AdminTicketOrdersSortBy = "nummer" | "kaeufer" | "betrag" | "gutschein" | "datum" | "status"

export type AdminTicketOrdersSortOrder = "asc" | "desc"

type AdminTicketOrderSortSource = Pick<
  AdminTicketOrderSummary,
  | "id"
  | "customerEmail"
  | "customerGivenName"
  | "customerFamilyName"
  | "paymentReference"
  | "bookingReference"
  | "bookingNumber"
  | "paymentStatus"
  | "ticketsIssuedAt"
  | "cancellation"
  | "stripeMode"
  | "totalCents"
  | "createdAt"
  | "voucher"
>

function adminTicketOrdersSortNumber(order: AdminTicketOrderSortSource): string {
  return adminTicketOrderBookingReference(order) ?? order.paymentReference ?? order.id
}

function adminTicketOrdersSortVoucher(order: AdminTicketOrderSortSource): string {
  // Ordnungen ohne Gutschein stehen am Ende (aufsteigend), Codes davor alphabetisch.
  return order.voucher?.code.toLocaleLowerCase("de-DE") ?? "￿"
}
function adminTicketOrdersSortBuyer(order: AdminTicketOrderSortSource): string {
  const name = [order.customerGivenName, order.customerFamilyName].filter(Boolean).join(" ")
  return `${name || order.customerEmail} ${order.customerEmail}`.toLocaleLowerCase("de-DE")
}

function adminTicketOrdersCompare(
  a: AdminTicketOrderSortSource,
  b: AdminTicketOrderSortSource,
  sortBy: AdminTicketOrdersSortBy,
): number {
  if (sortBy === "betrag") return a.totalCents - b.totalCents
  if (sortBy === "datum") return Date.parse(a.createdAt) - Date.parse(b.createdAt)
  if (sortBy === "status")
    return adminTicketOrderStatusLabel(adminTicketOrderStatusKey(a)).localeCompare(
      adminTicketOrderStatusLabel(adminTicketOrderStatusKey(b)),
      "de-DE",
    )
  if (sortBy === "kaeufer") return adminTicketOrdersSortBuyer(a).localeCompare(adminTicketOrdersSortBuyer(b), "de-DE")
  if (sortBy === "gutschein")
    return adminTicketOrdersSortVoucher(a).localeCompare(adminTicketOrdersSortVoucher(b), "de-DE")
  return adminTicketOrdersSortNumber(a).localeCompare(adminTicketOrdersSortNumber(b), "de-DE", { numeric: true })
}

/** Sortiert geladene Bestellungen client-seitig, stabil in Backend-Reihenfolge bei Gleichstand. */
export function adminTicketOrdersSort<T extends AdminTicketOrderSortSource>(
  orders: readonly T[],
  sortBy: AdminTicketOrdersSortBy,
  sortOrder: AdminTicketOrdersSortOrder,
): readonly T[] {
  const direction = sortOrder === "asc" ? 1 : -1
  return [...orders].sort((a, b) => direction * adminTicketOrdersCompare(a, b, sortBy))
}
