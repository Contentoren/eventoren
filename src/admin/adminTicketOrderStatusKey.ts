import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"

export type AdminTicketOrderStatusKey = "bezahlt" | "offen" | "sepa" | "fehlgeschlagen" | "abgelaufen" | "storniert"

export type AdminTicketOrderStatusFilter = "alle" | AdminTicketOrderStatusKey

export const adminTicketOrderStatusKeyOrder: readonly AdminTicketOrderStatusKey[] = [
  "bezahlt",
  "offen",
  "sepa",
  "fehlgeschlagen",
  "abgelaufen",
  "storniert",
]

type AdminTicketOrderStatusSource = Pick<AdminTicketOrderSummary, "paymentStatus" | "ticketsIssuedAt" | "cancellation">

/** Status-Schlüssel für Filter-Chips, gleiche Reihenfolge wie paymentLabel/paymentTone. */
export function adminTicketOrderStatusKey(order: AdminTicketOrderStatusSource): AdminTicketOrderStatusKey {
  if (order.cancellation) return "storniert"
  if (order.paymentStatus === "paid") return "bezahlt"
  if (order.paymentStatus === "failed") return "fehlgeschlagen"
  if (order.paymentStatus === "expired") return "abgelaufen"
  if (order.ticketsIssuedAt) return "sepa"
  return "offen"
}
