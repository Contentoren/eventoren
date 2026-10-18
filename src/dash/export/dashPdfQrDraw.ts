import { createResult, createResultError, type Result } from "#result"
import { ticketQrMatrixCreate } from "../../ticketing/ticketQrMatrixCreate.ts"

export type DashPdfQrDoc = {
  setFillColor(r: number, g: number, b: number): unknown
  rect(x: number, y: number, w: number, h: number, style?: string): unknown
}

export function dashPdfQrDraw(doc: DashPdfQrDoc, text: string, x: number, y: number, sizeMm: number): Result<void> {
  const op = "dashPdfQrDraw"
  const matrix = ticketQrMatrixCreate(text)
  if (!matrix.success) return createResultError(op, `QR-Code-Fehler: ${matrix.errorMessage}`)
  const modules = matrix.data
  const cell = sizeMm / modules.length
  doc.setFillColor(0, 0, 0)
  for (const [rowIndex, row] of modules.entries()) {
    for (const [columnIndex, dark] of row.entries()) {
      if (dark) doc.rect(x + columnIndex * cell, y + rowIndex * cell, cell + 0.01, cell + 0.01, "F")
    }
  }
  return createResult(undefined)
}
