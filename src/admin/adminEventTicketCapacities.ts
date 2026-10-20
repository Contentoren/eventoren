import type { AdminEventItem } from "./AdminEventItem.ts"

export function adminEventTicketCapacities(events: readonly AdminEventItem[], eventKey: string) {
  if (!eventKey) return []
  return events
    .filter((event) => event.id === eventKey)
    .map((event) => ({
      id: event.id,
      title: event.title,
      ticketCount: event.tiers.reduce((sum, tier) => sum + tier.capacity, 0),
    }))
}
