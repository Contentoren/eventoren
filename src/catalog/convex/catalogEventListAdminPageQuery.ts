import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { AdminEventItem } from "#src/admin/AdminEventItem.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogEventToEventItem } from "./catalogEventToEventItem.js"

const maxPageSize = 50
const maxTicketTiersPerEvent = 100

export const catalogEventListAdminPageQuery = query({
  args: {
    token: v.string(),
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
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId, paginationOpts }) => {
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

      const eventPage = await authorizedCtx.db
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
        const tiers = await authorizedCtx.db
          .query("catalogTicketTiers")
          .withIndex("eventId", (q) => q.eq("eventId", event._id))
          .take(maxTicketTiersPerEvent + 1)
        if (tiers.length > maxTicketTiersPerEvent) {
          return createResultError(op, `An event cannot expose more than ${maxTicketTiersPerEvent} ticket tiers`)
        }
        page.push({ ...catalogEventToEventItem(event, tiers, syncState?.syncedVersion), status: event.status })
      }

      return createResult({
        page,
        isDone: eventPage.isDone,
        continueCursor: eventPage.continueCursor,
      })
    }),
})
