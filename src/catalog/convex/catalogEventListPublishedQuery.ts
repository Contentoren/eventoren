import { query } from "#convex/_generated/server.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

export const catalogEventListPublishedQuery = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("catalogEvents")
      .withIndex("statusAndStartsAt", (q) => q.eq("status", "published"))
      .collect()
    const items = await Promise.all(
      events.map(async (event) => {
        const tiers = await ctx.db
          .query("catalogTicketTiers")
          .withIndex("eventId", (q) => q.eq("eventId", event._id))
          .collect()
        return catalogEventToEventItem(event, tiers)
      }),
    )
    return items
  },
})
