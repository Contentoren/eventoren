import { createResult, createResultError, type Result } from "#result"

export type DashPdfTableColumn = {
  readonly header: string
  readonly width?: number
  readonly align?: "left" | "right" | "center"
}

export type DashPdfTableInput = {
  readonly title: string
  readonly subtitle?: string
  readonly orientation: "portrait" | "landscape"
  readonly columns: DashPdfTableColumn[]
  readonly rows: string[][]
  readonly checkboxColumn?: boolean
  readonly footerNote?: string
}

const op = "dashPdfTableCreate"

export function dashPdfTableCreate(input: DashPdfTableInput): Promise<Result<Uint8Array>> {
  return dashPdfTableCreateInner(input)
    .then(createResult)
    .catch((error: unknown) => createResultError(op, "Die PDF-Tabelle konnte nicht erstellt werden.", String(error)))
}

async function dashPdfTableCreateInner(input: DashPdfTableInput): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ compress: true, format: "a4", orientation: input.orientation, unit: "mm" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 12
  const marginTop = 14
  const marginBottom = 14
  const contentWidth = pageWidth - marginX * 2

  const checkboxWidth = input.checkboxColumn === true ? 8 : 0
  const widths = dashPdfTableWidths(input.columns, contentWidth - checkboxWidth)
  const rowHeight = 7
  const headerHeight = 8
  const maxTextWidth = (columnIndex: number): number => widths[columnIndex]! - 2

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(input.title, marginX, marginTop)
  let cursorY = marginTop + 7
  if (input.subtitle !== undefined) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(110)
    const subtitleLines = doc.splitTextToSize(input.subtitle, contentWidth) as string[]
    doc.text(subtitleLines, marginX, cursorY)
    cursorY += subtitleLines.length * 5 + 2
    doc.setTextColor(0)
  }

  const drawHeader = (y: number): number => {
    doc.setFillColor(245, 245, 245)
    doc.rect(marginX, y, contentWidth, headerHeight, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    let x = marginX
    if (input.checkboxColumn === true) {
      doc.text("☐", x + 1, y + 5.5)
      x += checkboxWidth
    }
    for (const [index, column] of input.columns.entries()) {
      const text = dashPdfTableTruncate(doc, column.header, maxTextWidth(index))
      const textX = dashPdfTableTextX(x, widths[index]!, column.align ?? "left", text, doc)
      doc.text(text, textX, y + 5.5)
      x += widths[index]!
    }
    return y + headerHeight
  }

  const drawFooter = (page: number, total: number): void => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(120)
    const note = input.footerNote ?? ""
    if (note.length > 0) doc.text(dashPdfTableTruncate(doc, note, contentWidth - 30), marginX, pageHeight - 8)
    doc.text(`Seite ${page} von ${total}`, pageWidth - marginX, pageHeight - 8, { align: "right" })
    doc.setTextColor(0)
  }

  // First pass: count pages, so footers can show "Seite x von y" while drawing.
  let totalPages = 1
  {
    let y = cursorY + headerHeight
    for (const _ of input.rows) {
      if (y + rowHeight > pageHeight - marginBottom) {
        totalPages += 1
        y = marginTop + headerHeight
      }
      y += rowHeight
    }
  }
  // Second pass: draw.
  let page = 1
  let rowIndex = 0
  let y = drawHeader(cursorY)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  for (const row of input.rows) {
    if (y + rowHeight > pageHeight - marginBottom) {
      drawFooter(page, totalPages)
      doc.addPage()
      page += 1
      y = drawHeader(marginTop)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
    }
    if (rowIndex % 2 === 1) {
      doc.setFillColor(249, 249, 249)
      doc.rect(marginX, y, contentWidth, rowHeight, "F")
    }
    let x = marginX
    if (input.checkboxColumn === true) {
      doc.setDrawColor(100)
      doc.rect(x + 1.5, y + 1.8, 3.4, 3.4)
      x += checkboxWidth
    }
    for (const [index, column] of input.columns.entries()) {
      const text = dashPdfTableTruncate(doc, row[index] ?? "", maxTextWidth(index))
      const textX = dashPdfTableTextX(x, widths[index]!, column.align ?? "left", text, doc)
      doc.text(text, textX, y + 5)
      x += widths[index]!
    }
    y += rowHeight
    rowIndex += 1
  }
  drawFooter(page, totalPages)
  return new Uint8Array(doc.output("arraybuffer"))
}

type DashPdfFontMeasure = {
  getTextWidth(text: string): number
}

function dashPdfTableWidths(columns: DashPdfTableColumn[], available: number): number[] {
  const fixed = columns.map((column) => column.width ?? 0)
  const fixedTotal = fixed.reduce((sum, width) => sum + width, 0)
  const autoCount = columns.filter((column) => column.width === undefined).length
  if (autoCount === 0 || fixedTotal >= available) return fixed.map((width) => Math.max(width, 10))
  const autoWidth = (available - fixedTotal) / autoCount
  return fixed.map((width) => (width > 0 ? width : autoWidth))
}

function dashPdfTableTextX(
  x: number,
  width: number,
  align: "left" | "right" | "center",
  text: string,
  doc: DashPdfFontMeasure,
): number {
  if (align === "right") return x + width - 1 - doc.getTextWidth(text)
  if (align === "center") return x + (width - doc.getTextWidth(text)) / 2
  return x + 1
}

function dashPdfTableTruncate(doc: DashPdfFontMeasure, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidth) truncated = truncated.slice(0, -1)
  return `${truncated}…`
}
