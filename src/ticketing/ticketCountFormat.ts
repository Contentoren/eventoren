const formatter = new Intl.NumberFormat("de-DE")

export function ticketCountFormat(count: number): string {
  return formatter.format(count)
}
