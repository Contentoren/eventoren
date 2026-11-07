const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/u

/**
 * A date-only calendar value (YYYY-MM-DD) as midnight in Europe/Berlin with its explicit offset,
 * e.g. `2026-11-06T00:00:00+01:00`. Other values are returned unchanged.
 */
export function seoDateTimeBerlinFormat(date: string): string {
  if (!calendarDatePattern.test(date)) return date
  // 00:00Z lies before the 01:00Z DST switch, so it carries the offset that applied at Berlin midnight.
  const zoneName = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${date}T00:00:00Z`))
    .find((part) => part.type === "timeZoneName")?.value
  if (zoneName === undefined) return date
  const offset = zoneName === "GMT" ? "+00:00" : zoneName.replace("GMT", "")
  return `${date}T00:00:00${offset}`
}
