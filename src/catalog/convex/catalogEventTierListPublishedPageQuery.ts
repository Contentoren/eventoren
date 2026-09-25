import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { EventTicketTier } from "#src/events/EventTicketTier.ts"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

const maxPageSize = 50

export const catalogEventTierListPublishedPageQuery = query({
  args: { eventKey: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (
    ctx,
    { eventKey, paginationOpts },
  ): PromiseResult<{ page: readonly EventTicketTier[]; isDone: boolean; continueCursor: string } | null> => {
    const op = "catalogEventTierListPublishedPageQuery"
    if (
      !Number.isInteger(paginationOpts.numItems) ||
      paginationOpts.numItems < 1 ||
      paginationOpts.numItems > maxPageSize
    ) {
      return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
    }
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (event?.status !== "published") return createResult(null)

    const page = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id).eq("archivedAt", undefined))
      .paginate({ ...paginationOpts, maximumRowsRead: maxPageSize, maximumBytesRead: 512 * 1024 })
    return createResult({
      page: catalogEventToEventItem(event, page.page).tiers,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    })
  },
})
