import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { AdminTicketOrderSummary } from "#src/admin/AdminTicketOrderSummary.ts"
import { adminTicketOrderSearchMatches } from "#src/admin/adminTicketOrderSearchMatches.ts"
import { userRoleIsAdmin } from "#src/auth/model_field/userRoleIsAdmin.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const maxPageSize = 50
const maxPageBytes = 256 * 1024

export const ticketOrderListAdminPaginatedQuery = query({
  args: {
    token: v.string(),
    eventKey: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): PromiseResult<unknown> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, authorizedArgs) => {
      const op = "ticketOrderListAdminPaginatedQuery"
      const user = await authorizedCtx.db.get("users", authorizedArgs.userId)
      if (!user || !userRoleIsAdmin(user.role)) return createResultError(op, "Admin role required")
      if (
        !Number.isInteger(authorizedArgs.paginationOpts.numItems) ||
        authorizedArgs.paginationOpts.numItems < 1 ||
        authorizedArgs.paginationOpts.numItems > maxPageSize
      )
        return createResultError(op, `numItems must be between 1 and ${maxPageSize}`)

      const eventKey = authorizedArgs.eventKey
      const search = authorizedArgs.search?.trim().slice(0, 100) ?? ""
      const paginationOpts = {
        cursor: authorizedArgs.paginationOpts.cursor,
        endCursor: authorizedArgs.paginationOpts.endCursor,
        numItems: authorizedArgs.paginationOpts.numItems,
        maximumRowsRead: maxPageSize,
        maximumBytesRead: maxPageBytes,
      }
      // Booking numbers are exact indexed lookups; the customer snapshot already
      // contains both name fields and email for historical as well as new orders.
      const bookingNumber = /^(?:TEST-)?\d{1,15}$/i.test(search) ? Number(search.replace(/^TEST-/i, "")) : NaN
      const ordersPage = () => {
        if (search && Number.isSafeInteger(bookingNumber))
          return eventKey
            ? authorizedCtx.db
                .query("ticketOrders")
                .withIndex("eventKeyAndBookingNumber", (q) =>
                  q.eq("eventKey", eventKey).eq("bookingNumber", bookingNumber),
                )
                .order("desc")
                .paginate(paginationOpts)
            : authorizedCtx.db
                .query("ticketOrders")
                .withIndex("bookingNumber", (q) => q.eq("bookingNumber", bookingNumber))
                .order("desc")
                .paginate(paginationOpts)
        if (search)
          return authorizedCtx.db
            .query("ticketOrders")
            .withSearchIndex("contactSnapshotJson", (q) => {
              const indexed = q.search("contactSnapshotJson", search)
              return eventKey ? indexed.eq("eventKey", eventKey) : indexed
            })
            .paginate(paginationOpts)
        return eventKey
          ? authorizedCtx.db
              .query("ticketOrders")
              .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", eventKey))
              .order("desc")
              .paginate(paginationOpts)
          : authorizedCtx.db.query("ticketOrders").withIndex("createdAt").order("desc").paginate(paginationOpts)
      }
      const page = await ordersPage()
      const matches = search ? page.page.filter((order) => adminTicketOrderSearchMatches(order, search)) : page.page

      return createResult({
        ...page,
        page: matches.map(
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
            bookingNumber: order.bookingNumber,
            bookingReference: order.bookingReference,
            paymentStatus: order.paymentStatus,
            status: order.status,
            stripeMode: order.stripeMode,
            totalCents: order.totalCents,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            ticketsIssuedAt: order.ticketsIssuedAt,
            paymentMethodType: order.paymentMethodType,
            cancellation: order.cancellation,
          }),
        ),
      })
    }),
})
