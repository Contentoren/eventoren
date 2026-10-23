/** §§ 187, 188, 193 BGB: exclude acceptance day; expire at end of day 14,
 * extended to the next working day for Saturdays, Sundays and NRW holidays.
 * UTC dates below are date-only arithmetic, never the Convex runtime timezone. */
export function organizerConsumerActivationAvailableAt(acceptedAt: string): number {
  if (!Number.isFinite(Date.parse(acceptedAt))) return Number.POSITIVE_INFINITY
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(acceptedAt))
  const value = (name: string) => Number(parts.find((part) => part.type === name)?.value)
  const deadline = new Date(Date.UTC(value("year"), value("month") - 1, value("day") + 14))
  while (deadline.getUTCDay() === 0 || deadline.getUTCDay() === 6 || holiday(deadline))
    deadline.setUTCDate(deadline.getUTCDate() + 1)
  const midnight = deadline.getTime() + 86_400_000
  let instant = midnight
  // Resolve Berlin wall midnight, including both DST offsets.
  for (let i = 0; i < 3; i++) {
    const offset = new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Berlin",
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date(instant))
      .find((part) => part.type === "timeZoneName")
      ?.value.match(/GMT([+-])(\d{2}):(\d{2})/)
    if (!offset) return Number.POSITIVE_INFINITY
    instant = midnight - (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === "+" ? 1 : -1) * 60_000
  }
  return instant
}

function holiday(date: Date): boolean {
  const monthDay = date.toISOString().slice(5, 10)
  if (["01-01", "05-01", "10-03", "11-01", "12-25", "12-26"].includes(monthDay)) return true
  const year = date.getUTCFullYear()
  // Gregorian Easter (Meeus/Jones/Butcher).
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100
  const d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  const daysFromEaster = (date.getTime() - Date.UTC(year, month - 1, day)) / 86_400_000
  return [-2, 1, 39, 50, 60].includes(daysFromEaster)
}
