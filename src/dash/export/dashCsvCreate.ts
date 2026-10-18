function dashCsvNumberFormat(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(value).replace(".", ",")
}

function dashCsvCellFormat(cell: string | number | null): string {
  if (cell === null) return ""
  if (typeof cell === "number") return dashCsvNumberFormat(cell)
  const guarded = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell
  const needsQuotes = /[;"\r\n]/.test(guarded) || guarded.startsWith(" ") || guarded.endsWith(" ")
  if (!needsQuotes) return guarded
  return `"${guarded.replaceAll('"', '""')}"`
}

export function dashCsvCreate(header: string[], rows: (string | number | null)[][]): string {
  const lines = [header, ...rows].map((row) => row.map(dashCsvCellFormat).join(";"))
  return `﻿${lines.join("\r\n")}\r\n`
}
