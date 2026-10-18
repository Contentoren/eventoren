import { createResult, createResultError, type Result } from "#result"

export type DashPdfReportRow = {
  readonly label: string
  readonly value: string
  readonly emphasis?: boolean
  readonly tone?: "neutral" | "negative"
}

export type DashPdfReportSection = {
  readonly title: string
  readonly rows: DashPdfReportRow[]
}

export type DashPdfReportInput = {
  readonly title: string
  readonly subtitle?: string
  readonly meta?: [string, string][]
  readonly sections: DashPdfReportSection[]
  readonly footerNote?: string
}

const op = "dashPdfReportCreate"

export function dashPdfReportCreate(input: DashPdfReportInput): Promise<Result<Uint8Array>> {
  return dashPdfReportCreateInner(input)
    .then(createResult)
    .catch((error: unknown) => createResultError(op, "Der PDF-Bericht konnte nicht erstellt werden.", String(error)))
}

async function dashPdfReportCreateInner(input: DashPdfReportInput): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ compress: true, format: "a4", orientation: "portrait", unit: "mm" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 16
  const marginTop = 16
  const marginBottom = 14
  const contentWidth = pageWidth - marginX * 2
  const valueWidth = 62
  const labelWidth = contentWidth - valueWidth - 4
  const lineHeight = 6
  const sectionGap = 9

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(dashPdfReportTruncate(doc, input.title, contentWidth), marginX, marginTop)
  let cursorY = marginTop + 8
  if (input.subtitle !== undefined) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(110)
    const subtitleLines = doc.splitTextToSize(input.subtitle, contentWidth) as string[]
    doc.text(subtitleLines, marginX, cursorY)
    cursorY += subtitleLines.length * 5 + 2
    doc.setTextColor(0)
  }
  if (input.meta !== undefined) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(110)
    for (const [key, value] of input.meta) {
      doc.text(dashPdfReportTruncate(doc, `${key}: ${value}`, contentWidth), marginX, cursorY)
      cursorY += 5
    }
    doc.setTextColor(0)
    cursorY += 3
  }

  const pages = dashPdfReportPaginate(
    input,
    lineHeight,
    sectionGap,
    pageHeight - marginTop - marginBottom - (cursorY - marginTop),
  )
  let page = 1
  for (const [sectionIndex, section] of input.sections.entries()) {
    for (const [rowIndex, row] of section.rows.entries()) {
      if (pages.breaks.has(`${sectionIndex}:${rowIndex}`)) {
        dashPdfReportFooter(doc, input.footerNote, page, pages.total, marginX, pageWidth, pageHeight)
        doc.addPage()
        page += 1
        cursorY = marginTop
      }
      if (rowIndex === 0) {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(11)
        doc.text(dashPdfReportTruncate(doc, section.title, contentWidth), marginX, cursorY)
        cursorY += lineHeight + 1
        doc.setDrawColor(200)
        doc.line(marginX, cursorY - 2, marginX + contentWidth, cursorY - 2)
      }
      if (row.emphasis === true) {
        doc.setDrawColor(60)
        doc.line(marginX, cursorY - 4, marginX + contentWidth, cursorY - 4)
      }
      doc.setFont("helvetica", row.emphasis === true ? "bold" : "normal")
      doc.setFontSize(10)
      if (row.tone === "negative") doc.setTextColor(180, 30, 30)
      doc.text(dashPdfReportTruncate(doc, row.label, labelWidth), marginX, cursorY)
      const value = dashPdfReportTruncate(doc, row.value, valueWidth)
      doc.text(value, marginX + contentWidth - doc.getTextWidth(value), cursorY)
      doc.setTextColor(0)
      cursorY += lineHeight
      if (rowIndex === section.rows.length - 1) cursorY += sectionGap - lineHeight
    }
  }
  dashPdfReportFooter(doc, input.footerNote, page, pages.total, marginX, pageWidth, pageHeight)
  return new Uint8Array(doc.output("arraybuffer"))
}

function dashPdfReportPaginate(
  input: DashPdfReportInput,
  lineHeight: number,
  sectionGap: number,
  firstCapacity: number,
): { breaks: Set<string>; total: number } {
  const pageCapacity = firstCapacity
  const breaks = new Set<string>()
  let total = 1
  let remaining = pageCapacity
  for (const [sectionIndex, section] of input.sections.entries()) {
    for (const [rowIndex, row] of section.rows.entries()) {
      void row
      const need = (rowIndex === 0 ? lineHeight + 1 : 0) + lineHeight
      if (need > remaining && remaining < pageCapacity) {
        total += 1
        remaining = pageCapacity
        breaks.add(`${sectionIndex}:${rowIndex}`)
      }
      remaining -= need
      if (rowIndex === section.rows.length - 1) remaining -= sectionGap - lineHeight
      if (
        remaining < lineHeight &&
        !(sectionIndex === input.sections.length - 1 && rowIndex === section.rows.length - 1)
      ) {
        // Next content starts on a fresh page; break recorded when it arrives.
      }
    }
  }
  // If any break pushes content beyond the last page, totals already account for it.
  return { breaks, total }
}

function dashPdfReportFooter(
  doc: {
    setFont(font: string, style: string): unknown
    setFontSize(size: number): unknown
    setTextColor(r: number, g?: number, b?: number): unknown
    text(text: string, x: number, y: number, options?: { align?: "left" | "center" | "right" | "justify" }): unknown
    getTextWidth(text: string): number
  },
  footerNote: string | undefined,
  page: number,
  total: number,
  marginX: number,
  pageWidth: number,
  pageHeight: number,
): void {
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(120)
  if (footerNote !== undefined && footerNote.length > 0) {
    doc.text(dashPdfReportTruncate(doc, footerNote, pageWidth - marginX * 2 - 30), marginX, pageHeight - 8)
  }
  doc.text(`Seite ${page} von ${total}`, pageWidth - marginX, pageHeight - 8, { align: "right" })
  doc.setTextColor(0)
}

function dashPdfReportTruncate(doc: { getTextWidth(text: string): number }, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidth) truncated = truncated.slice(0, -1)
  return `${truncated}…`
}
