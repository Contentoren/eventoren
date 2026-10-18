const berlinTimeZone = "Europe/Berlin"

const berlinDayFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: berlinTimeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})
const berlinTimeFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: berlinTimeZone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

function dashRelativeDayStartBerlin(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: berlinTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ""
  return Date.parse(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`)
}

export function dashRelativeTimeFormat(iso: string, now: Date): string {
  const target = new Date(iso)
  const diffMs = target.getTime() - now.getTime()
  const absoluteMs = Math.abs(diffMs)
  const minuteMs = 60_000
  const hourMs = 3_600_000
  const time = berlinTimeFormat.format(target)

  if (absoluteMs < minuteMs) return "gerade eben"
  if (absoluteMs < hourMs) {
    const minutes = Math.floor(absoluteMs / minuteMs)
    return diffMs < 0 ? `vor ${minutes} Min.` : `in ${minutes} Min.`
  }

  const dayStartUtc = dashRelativeDayStartBerlin(now)
  const dayMs = 86_400_000
  const isoDay = (value: Date): string => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: berlinTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value)
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ""
    return `${part("year")}-${part("month")}-${part("day")}`
  }
  const dayDiff = Math.round((Date.parse(`${isoDay(target)}T00:00:00Z`) - dayStartUtc) / dayMs)
  if (dayDiff === 0) {
    const hours = Math.floor(absoluteMs / hourMs)
    if (hours < 1) return "gerade eben"
    return diffMs < 0 ? `vor ${hours} Std.` : `in ${hours} Std.`
  }
  if (dayDiff === -1) return `gestern, ${time}`
  if (dayDiff === 1) return `morgen, ${time}`
  if (dayDiff < 0) {
    if (dayDiff > -7) return `vor ${Math.abs(dayDiff)} Tagen`
    return berlinDayFormat.format(target)
  }
  if (dayDiff < 30) return `in ${dayDiff} Tagen`
  return berlinDayFormat.format(target)
}
