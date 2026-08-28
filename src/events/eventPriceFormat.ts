const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

export function eventPriceFormat(priceCents: number): string {
  return formatter.format(priceCents / 100)
}
