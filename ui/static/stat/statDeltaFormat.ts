const percentFormat = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** German percent formatting: "+12,5 %", "−12,5 %" (value in percent, negatives with true minus U+2212). */
export function statDeltaFormat(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0
  const formatted = percentFormat.format(normalized / 100).replace("-", "−")
  return normalized > 0 ? `+${formatted}` : formatted
}
