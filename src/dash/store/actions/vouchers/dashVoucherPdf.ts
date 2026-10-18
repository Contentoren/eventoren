import { createResult, createResultError, type Result } from "#result"

import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import type { DashVoucher } from "../../../model/dashVoucherSchema.ts"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"

const op = "dashVoucherPdf"

/** Gutschein als A6-Querformat-PDF: Org-Name, Betrag, Code, Empfänger, Nachricht, Gültigkeit. */
export function dashVoucherPdf(voucher: DashVoucher, org: DashOrg): Promise<Result<Uint8Array>> {
  return dashVoucherPdfInner(voucher, org)
    .then(createResult)
    .catch((error: unknown) => createResultError(op, "Das Gutschein-PDF konnte nicht erstellt werden.", String(error)))
}

async function dashVoucherPdfInner(voucher: DashVoucher, org: DashOrg): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ compress: true, format: "a6", orientation: "landscape", unit: "mm" })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 12
  const contentWidth = width - margin * 2

  doc.setFillColor(244, 240, 255)
  doc.rect(0, 0, width, height, "F")
  doc.setDrawColor(109, 88, 246)
  doc.setLineWidth(1.2)
  doc.rect(3, 3, width - 6, height - 6, "D")

  let cursor = margin + 2
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(30)
  doc.text(truncate(doc, org.name, contentWidth), margin, cursor)
  cursor += 7
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(`Einlösbar für alle Events von ${truncate(doc, org.name, contentWidth - 40)}`, margin, cursor)
  cursor += 10

  doc.setFont("helvetica", "bold")
  doc.setFontSize(26)
  doc.setTextColor(60, 30, 160)
  doc.text(dashCentsFormat(voucher.initialCents), margin, cursor)
  cursor += 7

  doc.setFont("courier", "bold")
  doc.setFontSize(13)
  doc.setTextColor(30)
  doc.text(voucher.code, margin, cursor)
  cursor += 8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60)
  const recipient = voucher.recipientName.trim().length > 0 ? voucher.recipientName.trim() : "Für dich"
  doc.text(truncate(doc, `Für ${recipient}`, contentWidth), margin, cursor)
  cursor += 5
  if (voucher.message.trim().length > 0) {
    doc.setFontSize(8)
    doc.setTextColor(110)
    const lines = doc.splitTextToSize(voucher.message.trim(), contentWidth) as string[]
    doc.text(lines.slice(0, 2), margin, cursor)
    cursor += Math.min(lines.length, 2) * 4 + 2
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(30)
  const validityText =
    voucher.expiresAt === null ? "Unbegrenzt gültig" : `Gültig bis ${dashDateFormat(voucher.expiresAt, "datum")}`
  doc.text(validityText, margin, height - margin)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(140)
  doc.text("eventoren.de", width - margin, height - margin, { align: "right" })
  return new Uint8Array(doc.output("arraybuffer"))
}

function truncate(doc: { getTextWidth(text: string): number }, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > maxWidth) cut = cut.slice(0, -1)
  return `${cut}…`
}
