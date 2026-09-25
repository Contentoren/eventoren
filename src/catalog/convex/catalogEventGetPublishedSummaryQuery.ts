import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

export const catalogEventGetPublishedSummaryQuery = query({
  args: { eventKey: v.string() },
  handler: async (ctx, { eventKey }) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (event?.status !== "published") return null

    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    return { ...catalogEventToEventItem(event, [], syncState?.syncedVersion), tiersComplete: false }
  },
})
