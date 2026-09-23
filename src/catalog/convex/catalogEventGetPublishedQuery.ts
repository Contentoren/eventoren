import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

export const catalogEventGetPublishedQuery = query({
  args: { eventKey: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
      .unique()
    if (event?.status !== "published") return null

    const tiers = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id).eq("archivedAt", undefined))
      .collect()
    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    return catalogEventToEventItem(event, tiers, syncState?.syncedVersion)
  },
})
