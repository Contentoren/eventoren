import type { AdminEventItem } from "./AdminEventItem.ts"

export function adminEventTicketCapacities(events: readonly AdminEventItem[], eventKey: string) {
  return events
    .filter((event) => !eventKey || event.id === eventKey)
    .map((event) => ({
      id: event.id,
      title: event.title,
      ticketCount: event.tiers.reduce((sum, tier) => sum + tier.capacity, 0),
    }))
}
