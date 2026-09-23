import { query } from "#convex/_generated/server.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

export const catalogEventListPublishedQuery = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("catalogEvents")
      .withIndex("statusAndStartsAt", (q) => q.eq("status", "published"))
      .collect()
    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    const items = await Promise.all(
      events.map(async (event) => {
        const tiers = await ctx.db
          .query("catalogTicketTiers")
          .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id).eq("archivedAt", undefined))
          .collect()
        return catalogEventToEventItem(event, tiers, syncState?.syncedVersion)
      }),
    )
    return items
  },
})
