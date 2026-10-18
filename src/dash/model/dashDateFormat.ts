const berlinTimeZone = "Europe/Berlin"

export type DashDateStyle = "kurz" | "lang" | "datum" | "zeit" | "wochentag-datum" | "monat-jahr"

const kurzDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: berlinTimeZone,
  weekday: "short",
  day: "numeric",
  month: "short",
})
const langWeekday = new Intl.DateTimeFormat("de-DE", { timeZone: berlinTimeZone, weekday: "long" })
const langDay = new Intl.DateTimeFormat("de-DE", { timeZone: berlinTimeZone, day: "numeric" })
const langMonth = new Intl.DateTimeFormat("de-DE", { timeZone: berlinTimeZone, month: "long" })
const langYear = new Intl.DateTimeFormat("de-DE", { timeZone: berlinTimeZone, year: "numeric" })
const dateFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: berlinTimeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})
const timeFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: berlinTimeZone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
const weekdayDateFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: berlinTimeZone,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
})
const monthYearFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: berlinTimeZone,
  month: "long",
  year: "numeric",
})

export function dashDateFormat(iso: string, style: DashDateStyle): string {
  const date = new Date(iso)
  switch (style) {
    case "kurz":
      return `${kurzDate.format(date)}, ${timeFormat.format(date)}`
    case "lang":
      return `${langWeekday.format(date)}, ${langDay.format(date)}. ${langMonth.format(date)} ${langYear.format(date)} · ${timeFormat.format(date)} Uhr`
    case "datum":
      return dateFormat.format(date)
    case "zeit":
      return timeFormat.format(date)
    case "wochentag-datum":
      return weekdayDateFormat.format(date)
    case "monat-jahr":
      return monthYearFormat.format(date)
  }
}
