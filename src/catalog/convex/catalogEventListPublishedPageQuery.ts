import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import type { EventFilter } from "#src/events/EventFilter.ts"
import type { EventItem } from "#src/events/EventItem.ts"
import { catalogEventFilterMatches } from "./catalogEventFilterMatches.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

const maxPageSize = 50
const maxPageBytes = 512 * 1024
const cursorVersion = 1

const eventFilterValidator = v.object({
  query: v.string(),
  location: v.string(),
  category: v.string(),
  timeWindow: v.union(v.literal("alle"), v.literal("heute"), v.literal("wochenende"), v.literal("monat")),
})

type PublishedPageCursor = {
  readonly version: number
  readonly filter: string
  readonly sourceCursor: string
}

export const catalogEventListPublishedPageQuery = query({
  args: {
    filter: eventFilterValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{ page: readonly EventItem[]; isDone: boolean; continueCursor: string }> => {
    const pageSize = args.paginationOpts.numItems
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
      return createResultError(
        "catalogEventListPublishedPageQuery",
        `numItems must be an integer from 1 to ${maxPageSize}`,
      )
    }

    const filter = args.filter satisfies EventFilter
    const filterFingerprint = JSON.stringify({
      query: filter.query.trim().toLowerCase(),
      location: filter.location.trim().toLowerCase(),
      category: filter.category,
      timeWindow: filter.timeWindow,
    })
    const sourceCursorResult = catalogEventListPublishedSourceCursorGet(args.paginationOpts.cursor, filterFingerprint)
    if (!sourceCursorResult.success) return sourceCursorResult
    const sourcePage = await ctx.db
      .query("catalogEvents")
      .withIndex("statusAndStartsAt", (q) => q.eq("status", "published"))
      .order("asc")
      .paginate({
        cursor: sourceCursorResult.data,
        numItems: pageSize,
        maximumRowsRead: pageSize,
        maximumBytesRead: maxPageBytes,
      })
    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()

    const now = new Date()
    const matchingEvents = sourcePage.page.filter((event) => catalogEventFilterMatches(event, filter, now))
    const page = await Promise.all(
      matchingEvents.map(async (event) => {
        const tiers = await ctx.db
          .query("catalogTicketTiers")
          .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id).eq("archivedAt", undefined))
          .collect()
        return catalogEventToEventItem(event, tiers, syncState?.syncedVersion)
      }),
    )

    return createResult({
      page,
      isDone: sourcePage.isDone,
      continueCursor: catalogEventListPublishedCursorCreate(sourcePage.continueCursor, filterFingerprint),
    })
  },
})

function catalogEventListPublishedCursorCreate(sourceCursor: string, filter: string): string {
  return JSON.stringify({ version: cursorVersion, filter, sourceCursor } satisfies PublishedPageCursor)
}

function catalogEventListPublishedSourceCursorGet(cursor: string | null, filter: string): Result<string | null> {
  const op = "catalogEventListPublishedSourceCursorGet"
  if (cursor === null) return createResult(null)

  let parsed: unknown
  try {
    parsed = JSON.parse(cursor)
  } catch {
    return createResultError(op, "Invalid published catalog page cursor")
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== cursorVersion ||
    !("filter" in parsed) ||
    parsed.filter !== filter ||
    !("sourceCursor" in parsed) ||
    typeof parsed.sourceCursor !== "string"
  ) {
    return createResultError(op, "Published catalog page cursor does not match the requested filter")
  }

  return createResult(parsed.sourceCursor)
}
