import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { AdminTicketOrderSummary } from "#src/admin/AdminTicketOrderSummary.ts"
import { userRoleIsDevOrAdmin } from "#src/auth/model_field/userRole.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const maxPageSize = 50
const maxPageBytes = 256 * 1024

export const ticketOrderListAdminPaginatedQuery = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): PromiseResult<unknown> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, authorizedArgs) => {
      const op = "ticketOrderListAdminPaginatedQuery"
      const user = await authorizedCtx.db.get("users", authorizedArgs.userId)
      if (!user || !userRoleIsDevOrAdmin(user.role)) return createResultError(op, "Admin role required")
      if (
        !Number.isInteger(authorizedArgs.paginationOpts.numItems) ||
        authorizedArgs.paginationOpts.numItems < 1 ||
        authorizedArgs.paginationOpts.numItems > maxPageSize
      )
        return createResultError(op, `numItems must be between 1 and ${maxPageSize}`)

      const page = await authorizedCtx.db.query("ticketOrders").withIndex("createdAt").order("desc").paginate({
        cursor: authorizedArgs.paginationOpts.cursor,
        endCursor: authorizedArgs.paginationOpts.endCursor,
        numItems: authorizedArgs.paginationOpts.numItems,
        maximumRowsRead: maxPageSize,
        maximumBytesRead: maxPageBytes,
      })

      return createResult({
        ...page,
        page: page.page.map(
          (order): AdminTicketOrderSummary => ({
            id: order._id,
            customerEmail: order.customerEmail,
            customerFamilyName: order.customerFamilyName,
            customerGivenName: order.customerGivenName,
            customerAddress: order.customerAddress,
            customerPhone: order.customerPhone,
            eventKey: order.eventKey,
            eventStartsAt: order.eventStartsAt,
            eventTitle: order.eventTitle,
            paymentReference: order.paymentReference,
            paymentStatus: order.paymentStatus,
            status: order.status,
            stripeMode: order.stripeMode,
            totalCents: order.totalCents,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          }),
        ),
      })
    }),
})
