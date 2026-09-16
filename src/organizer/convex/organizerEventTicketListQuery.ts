import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import type { Doc } from "#convex/_generated/dataModel.js"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerAuthorizeFn } from "./organizerAuthorizeFn.js"
import { organizerTicketProjectionCreate } from "./organizerTicketProjectionCreate.js"

type OrganizerTicketItem = ReturnType<typeof organizerTicketProjectionCreate>
type OrganizerTicketListCursor = {
  readonly version: number
  readonly eventKey: string
  readonly search: string
  readonly sourceCursor: string
}

const maxPageSize = 50
const maxPageBytes = 512 * 1024
const cursorVersion = 1

export const organizerEventTicketListQuery = query({
  args: {
    eventKey: v.string(),
    search: v.optional(v.string()),
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{ page: readonly OrganizerTicketItem[]; isDone: boolean; continueCursor: string }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const op = "organizerEventTicketListQuery"
      const globalAuthorization = await organizerAuthorizeFn(queryCtx, userId)
      if (!globalAuthorization.success) return globalAuthorization

      const pageSize = args.paginationOpts.numItems
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
        return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
      }

      const search = args.search?.trim().toLowerCase() ?? ""
      const sourceCursorResult = organizerTicketListSourceCursorGet(args.paginationOpts.cursor, args.eventKey, search)
      if (!sourceCursorResult.success) return sourceCursorResult

      const event = await queryCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
        .unique()
      if (!event) return createResultError(op, "The event was not found")

      const eventAuthorization = await organizerAuthorizeFn(queryCtx, userId, event.startsAt)
      if (!eventAuthorization.success) return eventAuthorization

      const sourcePage = await queryCtx.db
        .query("ticketIssued")
        .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", args.eventKey))
        .order("asc")
        .paginate({
          cursor: sourceCursorResult.data,
          numItems: pageSize,
          maximumRowsRead: pageSize,
          maximumBytesRead: maxPageBytes,
        })

      const orderIds = [...new Set(sourcePage.page.map((ticket) => ticket.orderId))]
      const orders = await Promise.all(orderIds.map((orderId) => queryCtx.db.get(orderId)))
      const ordersById = new Map<string, Doc<"ticketOrders"> | null>()
      for (const [index, orderId] of orderIds.entries()) ordersById.set(orderId, orders[index] ?? null)

      const items: OrganizerTicketItem[] = []
      for (const ticket of sourcePage.page) {
        const order = ordersById.get(ticket.orderId)
        if (!order || order.eventKey !== event.eventKey) continue
        const item = organizerTicketProjectionCreate(ticket, order, event)
        if (search.length > 0 && !organizerTicketSearchMatches(item, search)) continue
        items.push(item)
      }

      return createResult({
        page: items,
        isDone: sourcePage.isDone,
        continueCursor: organizerTicketListCursorCreate(sourcePage.continueCursor, args.eventKey, search),
      })
    }),
})

function organizerTicketListCursorCreate(sourceCursor: string, eventKey: string, search: string): string {
  return JSON.stringify({ version: cursorVersion, eventKey, search, sourceCursor } satisfies OrganizerTicketListCursor)
}

function organizerTicketListSourceCursorGet(
  cursor: string | null,
  eventKey: string,
  search: string,
): Result<string | null> {
  const op = "organizerTicketListSourceCursorGet"
  if (cursor === null) return createResult(null)

  let parsed: unknown
  try {
    parsed = JSON.parse(cursor)
  } catch {
    return createResultError(op, "Invalid organizer ticket page cursor")
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== cursorVersion ||
    !("eventKey" in parsed) ||
    parsed.eventKey !== eventKey ||
    !("search" in parsed) ||
    parsed.search !== search ||
    !("sourceCursor" in parsed) ||
    typeof parsed.sourceCursor !== "string"
  ) {
    return createResultError(op, "Organizer ticket page cursor does not match the requested event or search")
  }

  return createResult(parsed.sourceCursor)
}

function organizerTicketSearchMatches(item: OrganizerTicketItem, search: string): boolean {
  return [item.participantName, item.buyerName, item.buyerGivenName, item.buyerFamilyName].some((value) =>
    value.toLowerCase().includes(search),
  )
}
