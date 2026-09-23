import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { userRoleIsDevOrAdmin } from "#src/auth/model_field/userRole.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

export const ticketOrderGetAdminQuery = query({
  args: { token: v.string(), orderId: v.id("ticketOrders") },
  handler: async (ctx, args): PromiseResult<unknown> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, authorizedArgs) => {
      const op = "ticketOrderGetAdminQuery"
      const user = await authorizedCtx.db.get("users", authorizedArgs.userId)
      if (!user || !userRoleIsDevOrAdmin(user.role)) return createResultError(op, "Admin role required")
      const order = await authorizedCtx.db.get(args.orderId)
      if (!order) return createResultError(op, "Bestellung nicht gefunden")
      const lines = await authorizedCtx.db
        .query("ticketOrderLines")
        .withIndex("orderId", (q) => q.eq("orderId", args.orderId))
        .collect()
      return createResult({
        id: order._id,
        customerEmail: order.customerEmail,
        customerGivenName: order.customerGivenName ?? null,
        customerFamilyName: order.customerFamilyName ?? null,
        customerAddress: order.customerAddress ?? null,
        customerPhone: order.customerPhone ?? null,
        eventKey: order.eventKey,
        eventTitle: order.eventTitle,
        eventSubtitle: order.eventSubtitle,
        eventStartsAt: order.eventStartsAt,
        eventEndsAt: order.eventEndsAt,
        eventDoorsAt: order.eventDoorsAt,
        venue: order.venue,
        city: order.city,
        eventAddress: order.address,
        organizer: order.organizer,
        subtotalCents: order.subtotalCents,
        feeCents: order.feeCents,
        totalCents: order.totalCents,
        paymentReference: order.paymentReference,
        billingOrderReference: order.billingOrderReference ?? null,
        stripeMode: order.stripeMode,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lines: lines.map((line) => ({
          tierName: line.tierName,
          quantity: line.quantity,
          priceCents: line.priceCents,
          feeCents: line.feeCents,
        })),
      })
    }),
})
