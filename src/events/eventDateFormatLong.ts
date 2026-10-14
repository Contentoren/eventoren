const formatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
})

export function eventDateFormatLong(isoDate: string): string {
  return formatter.format(new Date(isoDate))
}
