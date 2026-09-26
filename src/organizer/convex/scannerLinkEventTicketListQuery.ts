import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import type { Doc } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import { organizerTicketProjectionCreate } from "./organizerTicketProjectionCreate.js"
import { scannerLinkEventAuthorizeFn } from "./scannerLinkEventAuthorizeFn.js"

type TicketItem = ReturnType<typeof organizerTicketProjectionCreate>
type TicketCursor = { version: number; linkId: string; eventKey: string; search: string; sourceCursor: string }
const maxPageSize = 50

export const scannerLinkEventTicketListQuery = query({
  args: {
    code: v.string(),
    eventKey: v.string(),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{ page: readonly TicketItem[]; isDone: boolean; continueCursor: string }> => {
    const op = "scannerLinkEventTicketListQuery"
    const allowed = await scannerLinkEventAuthorizeFn(ctx, args.code, args.eventKey)
    if (!allowed.success) return allowed
    const pageSize = args.paginationOpts.numItems
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize)
      return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
    const search = args.search?.trim().toLowerCase() ?? ""
    const cursor = scannerLinkTicketCursorRead(args.paginationOpts.cursor, allowed.data._id, args.eventKey, search)
    if (!cursor.success) return cursor
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
      .unique()
    if (!event) return createResultError(op, "Event unavailable")

    const sourcePage = await ctx.db
      .query("ticketIssued")
      .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", args.eventKey))
      .order("asc")
      .paginate({ cursor: cursor.data, numItems: pageSize, maximumRowsRead: pageSize, maximumBytesRead: 512 * 1024 })
    const orderIds = [...new Set(sourcePage.page.map((ticket) => ticket.orderId))]
    const orders = await Promise.all(orderIds.map((id) => ctx.db.get(id)))
    const ordersById = new Map<string, Doc<"ticketOrders"> | null>()
    for (const [index, id] of orderIds.entries()) ordersById.set(id, orders[index] ?? null)
    const page: TicketItem[] = []
    for (const ticket of sourcePage.page) {
      const order = ordersById.get(ticket.orderId)
      if (!order || order.eventKey !== event.eventKey) continue
      const item = organizerTicketProjectionCreate(ticket, order, event)
      if (
        search &&
        ![item.participantName, item.buyerName, item.buyerGivenName, item.buyerFamilyName].some((value) =>
          value.toLowerCase().includes(search),
        )
      )
        continue
      page.push(item)
    }
    return createResult({
      page,
      isDone: sourcePage.isDone,
      continueCursor: JSON.stringify({
        version: 1,
        linkId: allowed.data._id,
        eventKey: args.eventKey,
        search,
        sourceCursor: sourcePage.continueCursor,
      } satisfies TicketCursor),
    })
  },
})

function scannerLinkTicketCursorRead(
  cursor: string | null,
  linkId: string,
  eventKey: string,
  search: string,
): Result<string | null> {
  const op = "scannerLinkTicketCursorRead"
  if (cursor === null) return createResult(null)
  let parsed: unknown
  try {
    parsed = JSON.parse(cursor)
  } catch {
    return createResultError(op, "Invalid ticket cursor")
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("linkId" in parsed) ||
    parsed.linkId !== linkId ||
    !("eventKey" in parsed) ||
    parsed.eventKey !== eventKey ||
    !("search" in parsed) ||
    parsed.search !== search ||
    !("sourceCursor" in parsed) ||
    typeof parsed.sourceCursor !== "string"
  )
    return createResultError(op, "Ticket cursor does not match link, event or search")
  return createResult(parsed.sourceCursor)
}
