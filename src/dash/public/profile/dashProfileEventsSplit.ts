import type { DashEvent } from "../../model/dashEventSchema.ts"

export interface DashProfileEventsSplit {
  upcoming: DashEvent[]
  past: DashEvent[]
}

/**
 * Teilt öffentliche Events eines Veranstalters: kommend (Zukunft, nicht abgesagt)
 * und vergangen (Vergangenheit oder abgesagt). Entwürfe und nicht-gelistete
 * Events erscheinen nie; abgesagte nur unter "vergangen".
 */
export function dashProfileEventsSplit(args: { events: readonly DashEvent[]; now: Date }): DashProfileEventsSplit {
  const { events, now } = args
  const visible = events.filter((event) => event.status === "veroeffentlicht" || event.status === "abgesagt")
  const publicEvents = visible.filter((event) => event.visibility === "oeffentlich")
  const upcoming = publicEvents
    .filter((event) => event.status === "veroeffentlicht" && new Date(event.startsAt) >= now)
    .sort((left, right) => (left.startsAt < right.startsAt ? -1 : left.startsAt > right.startsAt ? 1 : 0))
  const past = publicEvents
    .filter((event) => event.status === "abgesagt" || new Date(event.startsAt) < now)
    .sort((left, right) => (left.startsAt > right.startsAt ? -1 : left.startsAt < right.startsAt ? 1 : 0))
  return { upcoming, past }
}
