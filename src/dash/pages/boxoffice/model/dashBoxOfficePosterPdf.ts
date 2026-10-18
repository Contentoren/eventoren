import { createResult, createResultError, type Result } from "#result"

import { dashPdfQrDraw } from "../../../export/dashPdfQrDraw.ts"

const op = "dashBoxOfficePosterPdf"

/** Erstellt das Kassen-QR-Plakat (A4, Portrait) für die Selbstbedienung an der Abendkasse. */
export function dashBoxOfficePosterPdf(input: {
  title: string
  dateLine: string
  eventId: string
}): Promise<Result<Uint8Array>> {
  return dashBoxOfficePosterPdfInner(input)
    .then(createResult)
    .catch((error: unknown) => createResultError(op, "Das Kassen-Plakat konnte nicht erstellt werden.", String(error)))
}

async function dashBoxOfficePosterPdfInner(input: {
  title: string
  dateLine: string
  eventId: string
}): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ compress: true, format: "a4", orientation: "portrait", unit: "mm" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const centerX = pageWidth / 2

  doc.setFont("helvetica", "bold")
  doc.setFontSize(28)
  doc.text("Tickets an der Abendkasse", centerX, 38, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  const titleLines = doc.splitTextToSize(input.title, pageWidth - 40) as string[]
  doc.text(titleLines, centerX, 54, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.setTextColor(110)
  doc.text(input.dateLine, centerX, 54 + titleLines.length * 7 + 4, { align: "center" })
  doc.setTextColor(0)

  const qrSize = 90
  const qr = dashPdfQrDraw(doc, `https://eventoren.de/abendkasse/${input.eventId}`, centerX - qrSize / 2, 96, qrSize)
  if (!qr.success) throw new Error(qr.errorMessage)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(13)
  doc.text("Mit dem Handy scannen und direkt bezahlen", centerX, 200, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Nur bargeldlos", centerX, pageHeight - 16, { align: "center" })
  return new Uint8Array(doc.output("arraybuffer"))
}
