import { createResult, createResultError, type Result } from "#result"

import { eventPriceFormat } from "../../../../events/eventPriceFormat.ts"
import { dashPdfReportCreate } from "../../../export/dashPdfReportCreate.ts"
import { dashTaxCompute } from "../../../model/dashTaxCompute.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export function dashOrderInvoicePdf(orderId: string, store: DashStore = dashStoreGet()): Promise<Result<Uint8Array>> {
  const op = "dashOrderInvoicePdf"
  const order = store.state.orders.find((candidate) => candidate.id === orderId)
  if (!order) return Promise.resolve(createResultError(op, "Bestellung nicht gefunden."))
  const org = store.state.orgs.find((candidate) => candidate.id === order.orgId)
  if (!org) return Promise.resolve(createResultError(op, "Organisation nicht gefunden."))
  const title = order.invoiceNumber ? `Rechnung ${order.invoiceNumber}` : "Beleg"
  const meta: [string, string][] = [
    ["Rechnungsdatum", dashOrderInvoiceBerlinDate()],
    ["Bestellnummer", order.number],
    ["Käufer", `${order.buyer.firstName} ${order.buyer.lastName} <${order.buyer.email}>`],
    ["Veranstalter", `${org.imprint.legalName}, ${org.imprint.street}, ${org.imprint.zip} ${org.imprint.city}`],
  ]
  const positionRows = order.lines.map((line) => ({
    label: `${line.quantity} × ${line.name}`,
    value: eventPriceFormat(line.unitPriceCents * line.quantity),
  }))
  const sumRows = [
    ...(order.discount && order.discount.amountCents > 0
      ? [{ label: "Rabatt", value: `−${eventPriceFormat(order.discount.amountCents)}`, tone: "negative" as const }]
      : []),
    ...(order.voucher && order.voucher.amountCents > 0
      ? [{ label: "Gutschein", value: `−${eventPriceFormat(order.voucher.amountCents)}`, tone: "negative" as const }]
      : []),
    { label: "Servicegebühr", value: eventPriceFormat(order.serviceFeeCents) },
    { label: "Gesamt", value: eventPriceFormat(order.totalCents), emphasis: true },
  ]
  const taxTotals = new Map<number, number>()
  for (const line of order.lines) {
    const discountShare = order.discount?.amountCents ?? 0
    const lineTotal = order.lines.reduce((sum, candidate) => sum + candidate.unitPriceCents * candidate.quantity, 0)
    const share =
      lineTotal > 0 && discountShare > 0
        ? Math.round((discountShare * line.unitPriceCents * line.quantity) / lineTotal)
        : 0
    const gross = Math.max(0, line.unitPriceCents * line.quantity - share)
    const { taxCents } = dashTaxCompute({ grossCents: gross, rateBps: line.taxRateBps, status: org.tax.status })
    taxTotals.set(line.taxRateBps, (taxTotals.get(line.taxRateBps) ?? 0) + taxCents)
  }
  const taxRows =
    org.tax.status === "klein"
      ? [{ label: "Umsatzsteuer", value: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." }]
      : [...taxTotals.entries()]
          .sort(([a], [b]) => a - b)
          .map(([rateBps, taxCents]) => ({
            label: `USt ${(rateBps / 100).toFixed(1).replace(".", ",")} %`,
            value: eventPriceFormat(taxCents),
          }))
  const refundRows = order.refunds.map((refund, index) => ({
    label: `Erstattung ${index + 1} · ${refund.reason}`,
    value: `−${eventPriceFormat(refund.amountCents)}`,
    tone: "negative" as const,
  }))
  return dashPdfReportCreate({
    title,
    meta,
    sections: [
      { title: "Positionen", rows: positionRows.length > 0 ? positionRows : [{ label: "—", value: "—" }] },
      { title: "Summe", rows: sumRows },
      { title: "USt", rows: taxRows.length > 0 ? taxRows : [{ label: "Umsatzsteuer", value: eventPriceFormat(0) }] },
      ...(refundRows.length > 0 ? [{ title: "Erstattungen", rows: refundRows }] : []),
    ],
    footerNote: "Demo-Beleg · Eventoren",
  })
}

function dashOrderInvoiceBerlinDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now)
}
