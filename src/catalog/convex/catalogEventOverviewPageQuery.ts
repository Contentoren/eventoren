import { paginationOptsValidator } from "convex/server"
import * as v from "valibot"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { catalogEventOverviewPageInputSchema } from "#src/catalog/catalogEventOverviewPageInputSchema.ts"
import { catalogEventOverviewTicketCreate } from "#src/catalog/catalogEventOverviewTicketCreate.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"

export const catalogEventOverviewPageQuery = query({
  args: {
    ...valibotToConvex(catalogEventOverviewPageInputSchema.entries),
    token: valibotToConvex({ token: catalogEventOverviewPageInputSchema.entries.token }).token,
    paginationOpts: paginationOptsValidator,
  },
  handler: (ctx, args) =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId, ...input }) => {
      const op = "catalogEventOverviewPageQuery"
      const authorization = await catalogAdminAuthorizeFn(authorizedCtx, userId)
      if (!authorization.success) return authorization
      const parsed = v.safeParse(catalogEventOverviewPageInputSchema, { ...input, token: args.token })
      if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
      const { eventKey, paginationOpts } = parsed.output
      const event = await authorizedCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
        .unique()
      if (!event) return createResultError(op, "Event not found")
      const tickets = await authorizedCtx.db
        .query("ticketIssued")
        .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
        .paginate({
          ...paginationOpts,
          // End-cursor ranges ignore byte limits: five 1 MiB tickets and
          // five 1 MiB orders leave room for event and authentication reads
          // within Convex's 16 MiB transaction limit.
          numItems: Math.min(paginationOpts.numItems, 5),
          maximumRowsRead: 10,
          maximumBytesRead: 512 * 1024,
        })
      // Expanded live ranges can exceed the join budget. Pass native splits
      // through before reading orders, without contributing a partial page.
      if (tickets.pageStatus === "SplitRequired" || tickets.page.length > 5) {
        const splitCursor = tickets.splitCursor
        if (
          splitCursor &&
          splitCursor !== paginationOpts.cursor &&
          splitCursor !== tickets.continueCursor &&
          splitCursor !== paginationOpts.endCursor
        ) {
          return createResult({ ...tickets, page: [], pageStatus: "SplitRequired" as const, splitCursor })
        }
        return createResultError(op, "Overview page range is too large; restart pagination")
      }
      const orders = new Map<string, Awaited<ReturnType<typeof authorizedCtx.db.get<"ticketOrders">>>>()
      const page = []
      for (const ticket of tickets.page) {
        let order = orders.get(ticket.orderId)
        if (order === undefined) {
          order = await authorizedCtx.db.get("ticketOrders", ticket.orderId)
          orders.set(ticket.orderId, order)
        }
        if (!order || order.eventKey !== eventKey || ticket.eventKey !== eventKey) {
          return createResultError(op, "Ticket order does not belong to this event")
        }
        page.push(catalogEventOverviewTicketCreate(ticket, order))
      }
      return createResult({ ...tickets, page })
    }),
})
