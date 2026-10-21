const timeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
})

export function veranstalterDashboardPreiseTimeFormat(instant: string) {
  const value = new Date(instant)
  return Number.isNaN(value.getTime()) ? "—" : `${timeFormat.format(value)} (Berlin)`
}
