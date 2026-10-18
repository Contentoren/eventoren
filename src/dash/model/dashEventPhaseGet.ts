import type { DashEvent } from "./dashEventSchema.ts"

export function dashEventPhaseGet(args: {
  event: DashEvent
  sold: number
  capacity: number
  now: Date
}): "entwurf" | "im-verkauf" | "pausiert" | "ausverkauft" | "live" | "beendet" | "abgesagt" {
  const { event, sold, capacity, now } = args
  if (event.status === "abgesagt") return "abgesagt"
  if (event.status === "entwurf") return "entwurf"
  if (now >= new Date(event.endsAt)) return "beendet"
  if (now >= new Date(event.doorsAt ?? event.startsAt)) return "live"
  if (sold >= capacity && capacity > 0) return "ausverkauft"
  if (event.salesPaused) return "pausiert"
  return "im-verkauf"
}
