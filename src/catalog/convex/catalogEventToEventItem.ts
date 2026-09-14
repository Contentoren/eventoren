import type { Doc } from "#convex/_generated/dataModel.js"
import type { EventItem } from "#src/events/EventItem.ts"

export function catalogEventToEventItem(
  event: Doc<"catalogEvents">,
  tiers: readonly Doc<"catalogTicketTiers">[],
): EventItem {
  const sortedTiers = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder)
  const eventTiers = sortedTiers.map((tier) => ({
    id: tier.tierKey,
    name: tier.name,
    description: tier.description,
    priceCents: tier.priceCents,
    feeCents: tier.feeCents,
    capacity: tier.capacity,
    available: tier.capacity - tier.reserved - tier.sold,
  }))

  return {
    id: event.eventKey,
    catalogVersion: event.catalogVersion,
    title: event.title,
    subtitle: event.subtitle,
    description: event.description,
    category: event.category,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    doorsAt: event.doorsAt,
    venue: event.venue,
    city: event.city,
    address: event.address,
    organizer: event.organizer,
    imageUrl: event.imageUrl,
    imageAlt: event.imageAlt,
    tags: event.tags,
    soldOut: eventTiers.length > 0 && eventTiers.every((tier) => tier.available === 0),
    tiers: eventTiers,
  }
}
