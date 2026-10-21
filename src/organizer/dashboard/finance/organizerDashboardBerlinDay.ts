/**
 * Berlin calendar-day helpers. Storage and transport always carry UTC
 * instants (ISO strings); every grouping and every day filter shown in the
 * dashboard uses the Europe/Berlin calendar day, independent of the browser
 * or server timezone. Convex itself stays on UTC.
 */
const berlinDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const berlinDayPattern = /^\d{4}-\d{2}-\d{2}$/

export function organizerDashboardBerlinDayOf(instantIso: string): string | undefined {
  const time = Date.parse(instantIso)
  if (Number.isNaN(time)) return undefined
  return berlinDayFormat.format(new Date(time))
}

/**
 * Lists every Berlin day from `fromDay` to `toDay` (inclusive). Both bounds
 * are enforced to be valid calendar days and the range is capped at 366 days.
 */
export function organizerDashboardBerlinDayRangeCreate(
  fromDay: string,
  toDay: string,
): { success: true; days: string[] } | { success: false; errorMessage: string } {
  const op = "organizerDashboardBerlinDayRangeCreate"
  if (!berlinDayPattern.test(fromDay) || !berlinDayPattern.test(toDay)) {
    return { success: false, errorMessage: `${op}: Tage als JJJJ-MM-TT` }
  }
  if (fromDay > toDay) return { success: false, errorMessage: `${op}: Von-Datum nach Bis-Datum` }
  const days: string[] = []
  // Noon UTC keeps every Berlin day unambiguous across DST transitions.
  let cursor = Date.parse(`${fromDay}T12:00:00.000Z`)
  const end = Date.parse(`${toDay}T12:00:00.000Z`)
  while (cursor <= end) {
    const day = berlinDayFormat.format(new Date(cursor))
    if (!days.includes(day)) days.push(day)
    if (days.length > 366) return { success: false, errorMessage: `${op}: Zeitraum maximal 366 Tage` }
    cursor += 24 * 60 * 60 * 1000
  }
  return { success: true, days }
}

/** Today's Berlin day for the default 30-day KPI window. */
export function organizerDashboardBerlinToday(nowIso: string): string {
  return organizerDashboardBerlinDayOf(nowIso) ?? nowIso.slice(0, 10)
}
