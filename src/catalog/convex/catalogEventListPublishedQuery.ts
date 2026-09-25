import { query } from "#convex/_generated/server.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

const maxPublishedEvents = 50
const maxActiveTiersPerEvent = 50

export const catalogEventListPublishedQuery = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("catalogEvents")
      .withIndex("statusAndStartsAt", (q) => q.eq("status", "published"))
      .take(maxPublishedEvents + 1)
    if (events.length > maxPublishedEvents) {
      throw new Error(`Published catalog exceeds the legacy list limit of ${maxPublishedEvents}; use cursor pagination`)
    }

    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    const items = await Promise.all(
      events.map(async (event) => {
        const tiers = await ctx.db
          .query("catalogTicketTiers")
          .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id).eq("archivedAt", undefined))
          .take(maxActiveTiersPerEvent + 1)
        if (tiers.length > maxActiveTiersPerEvent) {
          throw new Error(
            `Published event ${event.eventKey} exceeds the legacy list limit of ${maxActiveTiersPerEvent} active tiers`,
          )
        }
        return catalogEventToEventItem(event, tiers, syncState?.syncedVersion)
      }),
    )
    return items
  },
})
