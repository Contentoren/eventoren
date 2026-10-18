const centsPlainFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const centsCompactFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function dashCentsFormat(cents: number, options?: { signed?: boolean; compact?: boolean }): string {
  const signed = options?.signed === true
  const compact = options?.compact === true
  const sign = signed ? (cents < 0 ? "−" : cents > 0 ? "+" : "") : cents < 0 ? "−" : ""
  const absolute = Math.abs(cents)
  if (compact) {
    const thousands = absolute / 100_000
    return `${sign}${centsCompactFormat.format(thousands)} Tsd. €`
  }
  return `${sign}${centsPlainFormat.format(absolute / 100)} €`
}
