const dangerousSpreadsheetPrefix = /^[=+\-@\t\r]/

const ticketActivationCodesCsvCellFormat = (value: string): string => {
  const safeValue = dangerousSpreadsheetPrefix.test(value) ? `'${value}` : value
  const escapedValue = safeValue.replaceAll('"', '""')

  if (/[;"\r\n]/.test(safeValue)) return `"${escapedValue}"`
  return escapedValue
}

export const ticketActivationCodesCsvFormat = (
  eventName: string,
  productName: string,
  codes: readonly { number: number; code: string }[],
): string => {
  const rows = [
    ["Event", eventName],
    ["Produkt", productName],
    [],
    ["Nummer", "Code"],
    ...codes.map(({ number, code }) => [String(number), code]),
  ]

  return `\uFEFF${rows.map((row) => row.map(ticketActivationCodesCsvCellFormat).join(";")).join("\r\n")}`
}
