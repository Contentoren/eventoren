import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type Result } from "#result"
import { organizerTicketCheckInHistoryProjectionCreate } from "./organizerTicketCheckInHistoryProjectionCreate.js"
import { scannerLinkEventAuthorizeFn } from "./scannerLinkEventAuthorizeFn.js"

export const scannerLinkTicketCheckInHistoryPaginatedQuery = query({
  args: {
    code: v.string(),
    eventKey: v.string(),
    ticketId: v.id("ticketIssued"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const op = "scannerLinkTicketCheckInHistoryPaginatedQuery"
    const allowed = await scannerLinkEventAuthorizeFn(ctx, args.code, args.eventKey)
    if (!allowed.success) return allowed
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket || ticket.eventKey !== args.eventKey) return createResultError(op, "Ticket unavailable")
    const order = await ctx.db.get(ticket.orderId)
    if (!order || order.eventKey !== args.eventKey) return createResultError(op, "Ticket unavailable")
    const cursor = scannerLinkHistoryCursorRead(args.cursor, allowed.data._id, ticket._id)
    if (!cursor.success) return cursor
    const history = await ctx.db
      .query("ticketCheckInHistory")
      .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
      .order("desc")
      .paginate({ numItems: 20, cursor: cursor.data, maximumRowsRead: 20, maximumBytesRead: 512 * 1024 })
    return createResult({
      page: history.page.map(organizerTicketCheckInHistoryProjectionCreate),
      isDone: history.isDone,
      continueCursor: JSON.stringify({
        version: 1,
        linkId: allowed.data._id,
        ticketId: ticket._id,
        sourceCursor: history.continueCursor,
      }),
    })
  },
})

function scannerLinkHistoryCursorRead(cursor: string | null, linkId: string, ticketId: string): Result<string | null> {
  const op = "scannerLinkHistoryCursorRead"
  if (cursor === null) return createResult(null)
  let parsed: unknown
  try {
    parsed = JSON.parse(cursor)
  } catch {
    return createResultError(op, "Invalid history cursor")
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("linkId" in parsed) ||
    parsed.linkId !== linkId ||
    !("ticketId" in parsed) ||
    parsed.ticketId !== ticketId ||
    !("sourceCursor" in parsed) ||
    typeof parsed.sourceCursor !== "string"
  )
    return createResultError(op, "History cursor does not match link or ticket")
  return createResult(parsed.sourceCursor)
}
