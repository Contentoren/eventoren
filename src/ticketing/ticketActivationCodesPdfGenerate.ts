type TicketActivationCodeEntry = {
  readonly number: number
  readonly code: string
}

export const ticketActivationCodesPdfGenerate = async (
  eventName: string,
  productName: string,
  codes: readonly TicketActivationCodeEntry[],
): Promise<Uint8Array> => {
  const { jsPDF } = await import("jspdf")

  const doc = new jsPDF({ compress: true, format: "a4", unit: "mm" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 15
  const marginTop = 18
  const marginBottom = 18
  const contentWidth = pageWidth - marginX * 2
  const numberColumnWidth = 40
  const codeColumnX = marginX + numberColumnWidth
  const rowHeight = 7

  const drawTableHeader = (y: number): number => {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("Nummer", marginX, y)
    doc.text("Code", codeColumnX, y)
    doc.setDrawColor(180)
    doc.line(marginX, y + 2, marginX + contentWidth, y + 2)
    return y + rowHeight
  }

  const drawFooter = (): void => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Seite ${doc.getNumberOfPages()}`, pageWidth - marginX, pageHeight - 10, { align: "right" })
    doc.setTextColor(0)
  }

  // Metadata once, first page only.
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("Freischaltungscodes", marginX, marginTop)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  const metaLines = doc.splitTextToSize([`Event: ${eventName}`, `Produkt: ${productName}`], contentWidth) as string[]
  doc.text(metaLines, marginX, marginTop + 9)

  let cursorY = marginTop + 9 + metaLines.length * 5.5 + 4
  cursorY = drawTableHeader(cursorY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  for (const entry of codes) {
    if (cursorY + rowHeight > pageHeight - marginBottom) {
      drawFooter()
      doc.addPage()
      cursorY = marginTop
      cursorY = drawTableHeader(cursorY)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
    }
    doc.text(String(entry.number), marginX, cursorY)
    doc.text(entry.code, codeColumnX, cursorY)
    cursorY += rowHeight
  }
  drawFooter()

  return new Uint8Array(doc.output("arraybuffer"))
}
