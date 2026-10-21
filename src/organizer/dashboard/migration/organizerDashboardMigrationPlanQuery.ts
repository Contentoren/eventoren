import { paginationOptsValidator } from "convex/server"
import { v as convexV } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"

const maxPageSize = 50

type OrganizerDashboardMigrationPlanItem = {
  eventId: string
  eventKey: string
  title: string
  startsAt: string
  status: string
}

/**
 * Paginated plan of unowned canonical catalog events (orgId unset), using
 * the orgIdAndStartsAt index with orgId undefined. Returns IDs and keys
 * only — no buyer PII.
 */
export const organizerDashboardMigrationPlanQuery = query({
  args: {
    token: convexV.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly OrganizerDashboardMigrationPlanItem[]
    readonly isDone: boolean
    readonly continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId, paginationOpts }) => {
      const op = "organizerDashboardMigrationPlanQuery"
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
        .withIndex("orgIdAndStartsAt", (q) => q.eq("orgId", undefined))
        .order("asc")
        .paginate({
          ...paginationOpts,
          maximumRowsRead: maxPageSize,
          maximumBytesRead: 512 * 1024,
        })
      const page: OrganizerDashboardMigrationPlanItem[] = []
      for (const event of eventPage.page) {
        if (event.deletedAt) continue
        page.push({
          eventId: event._id,
          eventKey: event.eventKey,
          title: event.title,
          startsAt: event.startsAt,
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
