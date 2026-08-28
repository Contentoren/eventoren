import type { EventTimeWindow } from "./EventTimeWindow.ts"

export function eventTimeWindowMatches(startsAt: string, timeWindow: EventTimeWindow, now: Date): boolean {
  if (timeWindow === "alle") return true

  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return false

  if (timeWindow === "heute") return start.toDateString() === now.toDateString()

  if (timeWindow === "monat")
    return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth() && start >= now

  const daysUntilSaturday = (6 - now.getDay() + 7) % 7
  const saturday = new Date(now)
  saturday.setDate(now.getDate() + daysUntilSaturday)
  saturday.setHours(0, 0, 0, 0)
  const monday = new Date(saturday)
  monday.setDate(saturday.getDate() + 2)

  return start >= saturday && start < monday
}
