const dashCentsPlainFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function dashMoneyFormat(cents: number | null): string {
  if (cents === null) return ""
  return dashCentsPlainFormat.format(cents / 100)
}
