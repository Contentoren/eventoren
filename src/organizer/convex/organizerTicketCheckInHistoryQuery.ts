import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, createResultErrorCode, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerTicketCheckInHistoryProjectionCreate } from "./organizerTicketCheckInHistoryProjectionCreate.js"
import { organizerTicketCheckInTicketResolve } from "./organizerTicketCheckInTicketResolve.js"

// Deprecated compatibility endpoint. Never return a partial array; clients with
// more history must switch to organizerTicketCheckInHistoryPaginatedQuery.
const legacyHistoryLimit = 50
export const organizerTicketCheckInHistoryQuery = query({
  args: {
    eventKey: v.string(),
    ticketId: v.id("ticketIssued"),
    token: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<readonly ReturnType<typeof organizerTicketCheckInHistoryProjectionCreate>[]> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const op = "organizerTicketCheckInHistoryQuery"
      const resolved = await organizerTicketCheckInTicketResolve(queryCtx, userId, args, op)
      if (!resolved.success) return resolved
      const { ticket } = resolved.data
      if (ticket._id !== args.ticketId) return createResultError(op, "The ticket was not found")

      const history = await queryCtx.db
        .query("ticketCheckInHistory")
        .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
        .order("desc")
        .take(legacyHistoryLimit + 1)
      if (history.length > legacyHistoryLimit)
        return {
          ...createResultErrorCode(
            op,
            `Check-in history exceeds ${legacyHistoryLimit} entries. Use organizerTicketCheckInHistoryPaginatedQuery instead.`,
            "organizer.check-in.history-limit-exceeded",
          ),
          statusCode: 400,
        }
      history.sort(
        (left, right) =>
          right.occurredAt.localeCompare(left.occurredAt) ||
          left._creationTime - right._creationTime ||
          left._id.localeCompare(right._id),
      )
      return createResult(history.map(organizerTicketCheckInHistoryProjectionCreate))
    }),
})
