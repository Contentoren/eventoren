/** Today's calendar date (YYYY-MM-DD) in Europe/Berlin, the publication cutoff. */
export function contentTodayRead(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}
