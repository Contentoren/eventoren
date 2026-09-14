import { internalQuery } from "#convex/_generated/server.js"
import { v } from "convex/values"

export const catalogSyncSnapshotQuery = internalQuery({
  args: { requestedVersion: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!state) return null

    const events = await ctx.db.query("catalogEvents").collect()
    const normalizedEvents = []
    for (const event of events.sort((left, right) => left.eventKey.localeCompare(right.eventKey))) {
      const tiers = await ctx.db
        .query("catalogTicketTiers")
        .withIndex("eventId", (q) => q.eq("eventId", event._id))
        .collect()
      normalizedEvents.push({
        eventKey: event.eventKey,
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
        status: event.status,
        catalogVersion: state.version,
        tiers: tiers
          .sort((left, right) => left.tierKey.localeCompare(right.tierKey))
          .map((tier) => ({
            tierKey: tier.tierKey,
            name: tier.name,
            description: tier.description,
            priceCents: tier.priceCents,
            feeCents: tier.feeCents,
            capacity: tier.capacity,
            reserved: tier.reserved,
            sold: tier.sold,
            sortOrder: tier.sortOrder,
            catalogVersion: state.version,
          })),
      })
    }

    return {
      requestedVersion: args.requestedVersion,
      catalogVersion: state.version,
      events: normalizedEvents,
    }
  },
})
