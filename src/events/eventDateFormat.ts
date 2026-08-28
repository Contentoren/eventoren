const formatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
})

export function eventDateFormat(isoDate: string): string {
  return formatter.format(new Date(isoDate))
}
