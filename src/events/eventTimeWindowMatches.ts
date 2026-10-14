import type { EventTimeWindow } from "./EventTimeWindow.ts"

export function eventTimeWindowMatches(startsAt: string, timeWindow: EventTimeWindow, now: Date): boolean {
  if (timeWindow === "alle") return true

  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(now.getTime())) return false

  const startDay = berlinCalendarDateGet(start)
  const today = berlinCalendarDateGet(now)

  if (timeWindow === "heute") return startDay === today

  if (timeWindow === "monat") return startDay.slice(0, 7) === today.slice(0, 7) && start >= now

  // UTC arithmetic on Berlin calendar dates, not on the stored event instants.
  const saturday = new Date(`${today}T00:00:00Z`)
  const daysUntilSaturday = (6 - saturday.getUTCDay() + 7) % 7
  saturday.setUTCDate(saturday.getUTCDate() + daysUntilSaturday)
  const monday = new Date(saturday)
  monday.setUTCDate(saturday.getUTCDate() + 2)

  return startDay >= saturday.toISOString().slice(0, 10) && startDay < monday.toISOString().slice(0, 10)
}

const calendarFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Berlin",
})

function berlinCalendarDateGet(date: Date): string {
  const parts = calendarFormatter.formatToParts(date)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value
  return `${part("year")}-${part("month")}-${part("day")}`
}
