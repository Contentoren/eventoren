import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { AdminEventItem } from "#src/admin/AdminEventItem.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogEventAdminListVisible } from "../catalogEventAdminListVisible.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

const maxPageSize = 50
const maxTicketTiersPerEvent = 100

export const catalogEventListAdminPageQuery = query({
  args: {
    token: v.string(),
    archiveOnly: v.optional(v.boolean()),
    eventKey: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly AdminEventItem[]
    readonly isDone: boolean
    readonly continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId, paginationOpts, archiveOnly, eventKey }) => {
      const op = "catalogEventListAdminPageQuery"
      const authorization = await catalogAdminAuthorizeFn(authorizedCtx, userId)
      if (!authorization.success) return authorization
      if (
        !Number.isInteger(paginationOpts.numItems) ||
        paginationOpts.numItems < 1 ||
        paginationOpts.numItems > maxPageSize
      ) {
        return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
      }

      const archiveOnlyFlag = archiveOnly ?? false

      const keyedEvent =
        eventKey === undefined
          ? undefined
          : await authorizedCtx.db
              .query("catalogEvents")
              .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
              .unique()
      const eventPage =
        eventKey !== undefined
          ? {
              page: keyedEvent && (!keyedEvent.deletedAt || keyedEvent.status === "archived") ? [keyedEvent] : [],
              isDone: true,
              continueCursor: "",
            }
          : await authorizedCtx.db
              .query("catalogEvents")
              .withIndex("startsAt")
              .order("asc")
              .paginate({
                ...paginationOpts,
                maximumRowsRead: maxPageSize,
                maximumBytesRead: 512 * 1024,
              })
      const syncState = await authorizedCtx.db
        .query("catalogSyncStates")
        .withIndex("key", (q) => q.eq("key", "catalog"))
        .unique()
      const page: AdminEventItem[] = []
      for (const event of eventPage.page) {
        if (eventKey === undefined && !catalogEventAdminListVisible(event, archiveOnlyFlag)) continue
        const tiers = await authorizedCtx.db
          .query("catalogTicketTiers")
          .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id).eq("archivedAt", undefined))
          .take(maxTicketTiersPerEvent + 1)
        if (tiers.length > maxTicketTiersPerEvent) {
          return createResultError(op, `An event cannot expose more than ${maxTicketTiersPerEvent} ticket tiers`)
        }
        const item = catalogEventToEventItem(event, tiers, syncState?.syncedVersion)
        const soldByTierKey = new Map(tiers.map((tier) => [tier.tierKey, tier.sold]))
        page.push({
          ...item,
          tiers: item.tiers.map((tier) => ({ ...tier, sold: soldByTierKey.get(tier.id) ?? 0 })),
          status: event.status,
        })
      }

      return createResult({
        page,
        isDone: eventPage.isDone,
        continueCursor: eventPage.continueCursor,
      })
    }),
})
