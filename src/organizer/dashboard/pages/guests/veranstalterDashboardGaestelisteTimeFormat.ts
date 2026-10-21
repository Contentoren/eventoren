const formatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
})
export function veranstalterDashboardGaestelisteTimeFormat(instant: string) {
  const value = new Date(instant)
  return Number.isNaN(value.getTime()) ? "—" : `${formatter.format(value)} (Berlin)`
}
