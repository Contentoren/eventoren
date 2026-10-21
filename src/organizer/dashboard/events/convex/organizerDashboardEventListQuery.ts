import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardEventInstantNormalize } from "#src/organizer/dashboard/events/model/organizerDashboardEventInstantNormalize.ts"
import { organizerDashboardEventListCursorCreate } from "#src/organizer/dashboard/events/model/organizerDashboardEventListCursorCreate.ts"
import { organizerDashboardEventListCursorParse } from "#src/organizer/dashboard/events/model/organizerDashboardEventListCursorParse.ts"
import { organizerDashboardEventListFilterSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventListFilterSchema.ts"
import {
  type OrganizerDashboardEventSummary,
  organizerDashboardEventSummaryCreate,
} from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const maxPageSize = 50
const maxPageBytes = 512 * 1024

const organizerDashboardEventListValidator = v.object({
  orgId: v.id("orgs"),
  token: v.string(),
  ...valibotObjectToConvexFields(organizerDashboardEventListFilterSchema),
  paginationOpts: paginationOptsValidator,
})

export const organizerDashboardEventListQuery = query({
  args: organizerDashboardEventListValidator,
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly OrganizerDashboardEventSummary[]
    readonly isDone: boolean
    readonly continueCursor: string
    readonly splitCursor?: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId, ...rest }) => {
      const op = "organizerDashboardEventListQuery"
      const authorization = await organizerDashboardAuthorize(queryCtx, userId, orgId)
      if (!authorization.success) return authorization

      const pageSize = rest.paginationOpts.numItems
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
        return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
      }

      let fromStartsAt: string | null = null
      if (rest.fromStartsAt !== undefined) {
        const normalized = await organizerDashboardEventInstantNormalize(rest.fromStartsAt)
        if (!normalized.success) return normalized
        fromStartsAt = normalized.data
      }
      let toStartsAt: string | null = null
      if (rest.toStartsAt !== undefined) {
        const normalized = await organizerDashboardEventInstantNormalize(rest.toStartsAt)
        if (!normalized.success) return normalized
        toStartsAt = normalized.data
      }
      if (fromStartsAt !== null && toStartsAt !== null && Date.parse(toStartsAt) < Date.parse(fromStartsAt)) {
        return createResultError(op, "toStartsAt must not be before fromStartsAt")
      }

      const status = rest.status ?? null
      const descending = rest.sort === "startsAtDesc"
      const search = (rest.search ?? "").trim().toLowerCase()
      const cursorArgs = {
        userId: String(userId),
        orgId: String(orgId),
        status,
        sort: rest.sort ?? null,
        search,
        fromStartsAt,
        toStartsAt,
      }
      const sourceCursor = await organizerDashboardEventListCursorParse({
        ...cursorArgs,
        cursor: rest.paginationOpts.cursor,
      })
      if (!sourceCursor.success) return sourceCursor
      const sourceEndCursor = await organizerDashboardEventListCursorParse({
        ...cursorArgs,
        cursor: rest.paginationOpts.endCursor ?? null,
      })
      if (!sourceEndCursor.success) return sourceEndCursor

      const paginateArgs = {
        cursor: sourceCursor.data,
        endCursor: sourceEndCursor.data,
        numItems: pageSize,
        maximumRowsRead: pageSize,
        maximumBytesRead: maxPageBytes,
      }
      const indexed =
        status === null
          ? await queryCtx.db
              .query("catalogEvents")
              .withIndex("orgIdAndStartsAt", (q) => {
                if (fromStartsAt !== null && toStartsAt !== null) {
                  return q.eq("orgId", orgId).gte("startsAt", fromStartsAt).lte("startsAt", toStartsAt)
                }
                if (fromStartsAt !== null) return q.eq("orgId", orgId).gte("startsAt", fromStartsAt)
                if (toStartsAt !== null) return q.eq("orgId", orgId).lte("startsAt", toStartsAt)
                return q.eq("orgId", orgId)
              })
              .order(descending ? "desc" : "asc")
              .paginate(paginateArgs)
          : await queryCtx.db
              .query("catalogEvents")
              .withIndex("orgIdAndStatusAndStartsAt", (q) => {
                if (fromStartsAt !== null && toStartsAt !== null) {
                  return q
                    .eq("orgId", orgId)
                    .eq("status", status)
                    .gte("startsAt", fromStartsAt)
                    .lte("startsAt", toStartsAt)
                }
                if (fromStartsAt !== null)
                  return q.eq("orgId", orgId).eq("status", status).gte("startsAt", fromStartsAt)
                if (toStartsAt !== null) return q.eq("orgId", orgId).eq("status", status).lte("startsAt", toStartsAt)
                return q.eq("orgId", orgId).eq("status", status)
              })
              .order(descending ? "desc" : "asc")
              .paginate(paginateArgs)

      // Search stays a bounded postfilter over the indexed page. An empty page
      // with isDone false is honest: the caller continues with continueCursor.
      const page: OrganizerDashboardEventSummary[] = []
      for (const event of indexed.page) {
        if (event.deletedAt !== undefined) continue
        if (search.length > 0) {
          const haystack = `${event.title} ${event.eventKey} ${event.venue} ${event.city}`.toLowerCase()
          if (!haystack.includes(search)) continue
        }
        page.push(organizerDashboardEventSummaryCreate(event))
      }
      return createResult({
        page,
        isDone: indexed.isDone,
        continueCursor: organizerDashboardEventListCursorCreate({
          ...cursorArgs,
          sourceCursor: indexed.continueCursor,
        }),
        ...(indexed.splitCursor
          ? {
              splitCursor: organizerDashboardEventListCursorCreate({
                ...cursorArgs,
                sourceCursor: indexed.splitCursor,
              }),
            }
          : {}),
      })
    }),
})
