import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { TicketOrderSummary } from "#src/ticketing/TicketOrderSummary.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const maxPageSize = 50
const maxPageBytes = 512 * 1024

export const ticketOrderListMinePaginatedQuery = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): PromiseResult<unknown> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, authorizedArgs) => {
      const op = "ticketOrderListMinePaginatedQuery"
      if (
        !Number.isInteger(authorizedArgs.paginationOpts.numItems) ||
        authorizedArgs.paginationOpts.numItems < 1 ||
        authorizedArgs.paginationOpts.numItems > maxPageSize
      )
        return createResultError(op, `numItems must be between 1 and ${maxPageSize}`)

      const page = await authorizedCtx.db
        .query("ticketOrders")
        .withIndex("ownerUserIdAndCreatedAt", (q) => q.eq("ownerUserId", authorizedArgs.userId))
        .order("desc")
        .paginate({
          cursor: authorizedArgs.paginationOpts.cursor,
          endCursor: authorizedArgs.paginationOpts.endCursor,
          numItems: authorizedArgs.paginationOpts.numItems,
          maximumRowsRead: maxPageSize,
          maximumBytesRead: maxPageBytes,
        })

      return createResult({
        ...page,
        page: page.page.map(
          (order): TicketOrderSummary => ({
            id: order._id,
            checkoutKey: order.checkoutKey,
            eventKey: order.eventKey,
            eventTitle: order.eventTitle,
            eventSubtitle: order.eventSubtitle,
            eventStartsAt: order.eventStartsAt,
            eventEndsAt: order.eventEndsAt,
            eventDoorsAt: order.eventDoorsAt,
            venue: order.venue,
            city: order.city,
            address: order.address,
            organizer: order.organizer,
            imageUrl: order.imageUrl,
            imageAlt: order.imageAlt,
            catalogVersion: order.catalogVersion,
            subtotalCents: order.subtotalCents,
            feeCents: order.feeCents,
            totalCents: order.totalCents,
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          }),
        ),
      })
    }),
})
