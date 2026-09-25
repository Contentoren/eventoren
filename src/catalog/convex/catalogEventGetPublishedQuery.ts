import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

const maxLegacyActiveTiers = 50

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
      .take(maxLegacyActiveTiers + 1)
    if (tiers.length > maxLegacyActiveTiers) {
      throw new Error(
        `Published event ${event.eventKey} exceeds the legacy detail limit of ${maxLegacyActiveTiers} active tiers; use tier pages`,
      )
    }
    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    return catalogEventToEventItem(event, tiers, syncState?.syncedVersion)
  },
})
