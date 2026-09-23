import type { Doc } from "#convex/_generated/dataModel.js"
import type { EventItem } from "#src/events/EventItem.ts"

export function catalogEventToEventItem(
  event: Doc<"catalogEvents">,
  tiers: readonly Doc<"catalogTicketTiers">[],
  syncedCatalogVersion?: number,
): EventItem {
  const sortedTiers = tiers.filter((tier) => !tier.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder)
  const eventTiers = sortedTiers.map((tier) => ({
    id: tier.tierKey,
    name: tier.name,
    description: tier.description,
    priceCents: tier.priceCents,
    feeCents: tier.feeCents,
    capacity: tier.capacity,
    available: tier.capacity - tier.reserved - tier.sold,
    sortOrder: tier.sortOrder,
  }))

  return {
    id: event.eventKey,
    catalogVersion: Math.max(event.catalogVersion, syncedCatalogVersion ?? 0),
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
    imageVariants: event.imageVariants,
    imageAlt: event.imageAlt,
    tags: event.tags,
    soldOut: eventTiers.length > 0 && eventTiers.every((tier) => tier.available === 0),
    tiers: eventTiers,
  }
}
