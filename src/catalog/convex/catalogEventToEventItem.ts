import type { Doc } from "#convex/_generated/dataModel.js"
import type { EventItem } from "#src/events/EventItem.ts"
import { eventTicketTierMaxPerOrderGet } from "#src/events/eventTicketTierMaxPerOrderGet.ts"
import { eventTicketTierActivationCodeRequiredGet } from "#src/events/eventTicketTierActivationCodeRequiredGet.ts"

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
    startsAt: tier.startsAt ?? event.startsAt,
    doorsAt: tier.doorsAt ?? event.doorsAt,
    additionalDoorsAt: (tier.additionalDoorsAt ?? []).map((range) =>
      typeof range === "string" ? { startsAt: range, endsAt: "" } : range,
    ),
    endsAt: tier.endsAt ?? event.endsAt,
    priceCents: tier.priceCents,
    feeCents: tier.feeCents,
    capacity: tier.capacity,
    available: Math.max(0, tier.capacity - tier.sold),
    maxPerOrder: eventTicketTierMaxPerOrderGet(tier),
    activationCodeRequired: eventTicketTierActivationCodeRequiredGet(tier),
    sortOrder: tier.sortOrder,
  }))

  return {
    id: event.eventKey,
    catalogVersion: Math.max(event.catalogVersion, syncedCatalogVersion ?? 0),
    eventRevision: event.eventRevision ?? 1,
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
    highlights: event.highlights,
    inclusions: event.inclusions,
    exclusions: event.exclusions,
    soldOut: eventTiers.length > 0 && eventTiers.every((tier) => tier.available === 0),
    tiers: eventTiers,
  }
}
