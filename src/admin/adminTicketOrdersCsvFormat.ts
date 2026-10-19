const dangerousSpreadsheetPrefix = /^[=+\-@\t\r]/

const adminTicketOrdersCsvCellFormat = (value: string): string => {
  const safeValue = dangerousSpreadsheetPrefix.test(value) ? `'${value}` : value
  const escapedValue = safeValue.replaceAll('"', '""')
  if (/[;"\r\n]/.test(safeValue)) return `"${escapedValue}"`
  return escapedValue
}

/** Formatiert Bestellzeilen als deutsches CSV (;-getrennt, BOM) für den Admin-Export. */
export function adminTicketOrdersCsvFormat(rows: readonly (readonly string[])[]): string {
  return `\uFEFF${rows.map((row) => row.map(adminTicketOrdersCsvCellFormat).join(";")).join("\r\n")}`
}
