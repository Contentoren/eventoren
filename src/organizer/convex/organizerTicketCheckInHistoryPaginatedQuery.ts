import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerTicketCheckInHistoryProjectionCreate } from "./organizerTicketCheckInHistoryProjectionCreate.js"
import { organizerTicketCheckInTicketResolve } from "./organizerTicketCheckInTicketResolve.js"

const HISTORY_PAGE_SIZE = 20
const MAX_PAGE_BYTES = 512 * 1024

export const organizerTicketCheckInHistoryPaginatedQuery = query({
  args: {
    eventKey: v.string(),
    ticketId: v.id("ticketIssued"),
    token: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    page: readonly ReturnType<typeof organizerTicketCheckInHistoryProjectionCreate>[]
    continueCursor: string
    isDone: boolean
  }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const op = "organizerTicketCheckInHistoryPaginatedQuery"
      const resolved = await organizerTicketCheckInTicketResolve(queryCtx, userId, args, op)
      if (!resolved.success) return resolved
      const { ticket } = resolved.data
      if (ticket._id !== args.ticketId) return createResultError(op, "The ticket was not found")

      const history = await queryCtx.db
        .query("ticketCheckInHistory")
        .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
        .order("desc")
        .paginate({
          numItems: HISTORY_PAGE_SIZE,
          cursor: args.cursor,
          maximumRowsRead: HISTORY_PAGE_SIZE,
          maximumBytesRead: MAX_PAGE_BYTES,
        })
      return createResult({
        ...history,
        page: history.page.map(organizerTicketCheckInHistoryProjectionCreate),
      })
    }),
})
