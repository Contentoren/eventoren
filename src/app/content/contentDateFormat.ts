const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/u

const formatters = {
  de: new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "numeric", month: "long", year: "numeric" }),
  en: new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", day: "numeric", month: "long", year: "numeric" }),
}

/**
 * Long date in Europe/Berlin: DE "6. November 2026", EN "6 November 2026".
 * Date-only values (YYYY-MM-DD) keep their calendar day; instants are converted to Berlin time.
 */
export function contentDateFormat(date: string, lang: "de" | "en"): string {
  // Noon UTC is the same calendar day in Berlin all year, so date-only values never shift.
  const instant = calendarDatePattern.test(date) ? new Date(`${date}T12:00:00Z`) : new Date(date)
  if (Number.isNaN(instant.getTime())) return date
  return formatters[lang].format(instant)
}
