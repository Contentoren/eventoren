import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"

type AdminTicketOrdersExportText = {
  readonly bookingReference: (order: AdminTicketOrderSummary) => string | undefined
  readonly customerName: (order: AdminTicketOrderSummary) => string
  readonly dateFormat: (value: string) => string
  readonly eventTitle: (order: AdminTicketOrderSummary) => string
  readonly paymentLabel: (
    status: AdminTicketOrderSummary["paymentStatus"],
    order?: AdminTicketOrderSummary,
  ) => string | undefined
  readonly paymentMethodLabel: (paymentMethodType?: string | null) => string
  readonly priceFormat: (cents: number) => string
}

const adminTicketOrdersExportHeader = [
  "Nummer",
  "Käufer",
  "E-Mail",
  "Event",
  "Tickets",
  "Betrag",
  "Gutschein-Code",
  "Gutschein-Betrag",
  "Zahlart",
  "Datum",
  "Status",
] as const

/** Exportzeilen für gefilterte Admin-Bestellungen (Kopfzeile + eine Zeile je Bestellung). */
export function adminTicketOrdersExportRows(
  orders: readonly AdminTicketOrderSummary[],
  text: AdminTicketOrdersExportText,
): string[][] {
  return [
    [...adminTicketOrdersExportHeader],
    ...orders.map((order) => [
      text.bookingReference(order) ?? order.paymentReference,
      text.customerName(order),
      order.customerEmail,
      text.eventTitle(order),
      order.ticketCount === undefined ? "—" : String(order.ticketCount),
      text.priceFormat(order.totalCents),
      order.voucher?.code ?? "",
      order.voucher ? text.priceFormat(order.voucher.amountCents) : "",
      text.paymentMethodLabel(order.paymentMethodType),
      text.dateFormat(order.createdAt),
      text.paymentLabel(order.paymentStatus, order) ?? "",
    ]),
  ]
}
