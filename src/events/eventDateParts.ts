const dayFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", timeZone: "Europe/Berlin" })
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" })
const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" })
const yearFormatter = new Intl.DateTimeFormat("de-DE", { year: "numeric", timeZone: "Europe/Berlin" })

/** Split parts for calendar/stub style date blocks that stack day over month. */
export function eventDateParts(isoDate: string): { day: string; month: string; weekday: string; year: string } {
  const date = new Date(isoDate)

  return {
    day: dayFormatter.format(date),
    month: monthFormatter.format(date),
    weekday: weekdayFormatter.format(date),
    year: yearFormatter.format(date),
  }
}
