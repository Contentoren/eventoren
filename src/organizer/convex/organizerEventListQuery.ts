import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerAuthorizeFn } from "./organizerAuthorizeFn.js"
import { organizerEventProjectionCreate } from "./organizerEventProjectionCreate.js"

type OrganizerEventListCursor = {
  readonly version: number
  readonly userId: string
  readonly sourceCursor: string
}

const maxPageSize = 50
const maxPageBytes = 512 * 1024
const cursorVersion = 1

export const organizerEventListQuery = query({
  args: { paginationOpts: paginationOptsValidator, token: v.string() },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    page: readonly ReturnType<typeof organizerEventProjectionCreate>[]
    isDone: boolean
    continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const op = "organizerEventListQuery"
      const globalAuthorization = await organizerAuthorizeFn(queryCtx, userId)
      if (!globalAuthorization.success) return globalAuthorization

      const pageSize = args.paginationOpts.numItems
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
        return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
      }

      const sourceCursorResult = organizerEventListSourceCursorGet(args.paginationOpts.cursor, userId)
      if (!sourceCursorResult.success) return sourceCursorResult

      const sourcePage = await queryCtx.db.query("catalogEvents").withIndex("startsAt").order("asc").paginate({
        cursor: sourceCursorResult.data,
        numItems: pageSize,
        maximumRowsRead: pageSize,
        maximumBytesRead: maxPageBytes,
      })
      const page: ReturnType<typeof organizerEventProjectionCreate>[] = []
      for (const event of sourcePage.page) {
        const authorization = await organizerAuthorizeFn(queryCtx, userId, event.startsAt)
        if (!authorization.success) continue
        page.push(organizerEventProjectionCreate(event))
      }

      return createResult({
        page,
        isDone: sourcePage.isDone,
        continueCursor: organizerEventListCursorCreate(sourcePage.continueCursor, userId),
      })
    }),
})

function organizerEventListCursorCreate(sourceCursor: string, userId: string): string {
  return JSON.stringify({ version: cursorVersion, userId, sourceCursor } satisfies OrganizerEventListCursor)
}

function organizerEventListSourceCursorGet(cursor: string | null, userId: string): Result<string | null> {
  const op = "organizerEventListSourceCursorGet"
  if (cursor === null) return createResult(null)

  let parsed: unknown
  try {
    parsed = JSON.parse(cursor)
  } catch {
    return createResultError(op, "Invalid organizer event page cursor")
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== cursorVersion ||
    !("userId" in parsed) ||
    parsed.userId !== userId ||
    !("sourceCursor" in parsed) ||
    typeof parsed.sourceCursor !== "string"
  ) {
    return createResultError(op, "Organizer event page cursor does not match the current organizer")
  }

  return createResult(parsed.sourceCursor)
}
