const berlinDateTime = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const euroFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

/** Berlin wall-clock label for one stored UTC instant. */
export function veranstalterDashboardPublicTimeFormat(instant: string): string {
  const value = new Date(instant)
  if (Number.isNaN(value.getTime())) return "—"
  return `${berlinDateTime.format(value)} Uhr`
}

export function veranstalterDashboardPublicEuroFormat(cents: number): string {
  return euroFormat.format(cents / 100)
}
