import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.js"
import type { TicketActivationCode } from "#src/ticketing/TicketActivationCode.ts"
import type { TicketActivationCodeListPage } from "#src/ticketing/TicketActivationCodeListPage.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const pageSizeMax = 100

const ticketActivationCodeStatusFilter = v.union(v.literal("available"), v.literal("reserved"), v.literal("consumed"))

export const ticketActivationCodeListAdminQuery = query({
  args: {
    token: v.string(),
    eventKey: v.string(),
    tierKey: v.string(),
    status: v.optional(ticketActivationCodeStatusFilter),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): PromiseResult<TicketActivationCodeListPage> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, authorizedArgs) => {
      const op = "ticketActivationCodeListAdminQuery"
      const adminResult = await catalogAdminAuthorizeFn(authorizedCtx, authorizedArgs.userId)
      if (!adminResult.success) return adminResult
      if (
        !Number.isInteger(authorizedArgs.paginationOpts.numItems) ||
        authorizedArgs.paginationOpts.numItems < 1 ||
        authorizedArgs.paginationOpts.numItems > pageSizeMax
      )
        return createResultError(op, `numItems must be between 1 and ${pageSizeMax}`)

      const event = await authorizedCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", authorizedArgs.eventKey.trim()))
        .unique()
      if (!event || event.deletedAt) return createResultError(op, "Das Event wurde nicht gefunden")
      const tier = await authorizedCtx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", authorizedArgs.tierKey.trim()))
        .unique()
      if (!tier || tier.archivedAt) return createResultError(op, "Das Ticketprodukt wurde nicht gefunden")

      const status = authorizedArgs.status
      const page = status
        ? await authorizedCtx.db
            .query("ticketActivationCodes")
            .withIndex("tierIdAndStatusAndNumber", (q) => q.eq("tierId", tier._id).eq("status", status))
            .order("asc")
            .paginate(authorizedArgs.paginationOpts)
        : await authorizedCtx.db
            .query("ticketActivationCodes")
            .withIndex("tierIdAndNumber", (q) => q.eq("tierId", tier._id))
            .order("asc")
            .paginate(authorizedArgs.paginationOpts)

      const items: TicketActivationCode[] = []
      for (const code of page.page) {
        // Actor-scoped contact read: only admins listing codes see the linked order contact.
        const order = code.orderId ? await authorizedCtx.db.get("ticketOrders", code.orderId) : null
        items.push({
          id: code._id,
          number: code.number,
          code: code.code,
          status: code.status,
          orderId: code.orderId ?? null,
          orderBookingReference: order?.bookingReference ?? null,
          orderBookingNumber: order?.bookingNumber ?? null,
          customerEmail: order?.customerEmail ?? null,
          customerGivenName: order?.customerGivenName ?? null,
          customerFamilyName: order?.customerFamilyName ?? null,
          createdAt: code.createdAt,
          updatedAt: code.updatedAt,
        })
      }
      return createResult({ ...page, page: items })
    }),
})
