import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.js"

/** Read-only, admin-authorized correlation: never return customer data or checkout capability URLs. */
export const ticketE2eOrderProofQuery = query({
  args: { token: v.string(), orderId: v.string(), eventKey: v.string(), runId: v.string(), runCreatedAt: v.number() },
  handler: (ctx, args) =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId, orderId, eventKey, runId, runCreatedAt }) => {
      const op = "ticketE2eOrderProofQuery"
      const admin = await catalogAdminAuthorizeFn(authorizedCtx, userId)
      if (!admin.success) return admin
      if (eventKey !== `ticket-e2e-${runId}` || !Number.isSafeInteger(runCreatedAt) || runCreatedAt < 1)
        return createResultError(op, "Run marker mismatch")
      const id = authorizedCtx.db.normalizeId("ticketOrders", orderId)
      if (!id) return createResultError(op, "Invalid order ID")
      const order = await authorizedCtx.db.get("ticketOrders", id)
      const matching = await authorizedCtx.db
        .query("ticketOrders")
        .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", eventKey))
        .take(2)
      const event = await authorizedCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
        .unique()
      if (
        !order ||
        matching.length !== 1 ||
        matching[0]?._id !== id ||
        !event ||
        event._creationTime < runCreatedAt ||
        event.title !== `Ticket E2E ${runId}` ||
        event.organizer !== `Eventoren Ticket E2E ${runId}` ||
        order.eventKey !== eventKey ||
        order.eventTitle !== event.title ||
        order.organizer !== event.organizer ||
        order.customerGivenName !== "E2E" ||
        order.customerFamilyName !== runId ||
        order.stripeMode !== "test" ||
        order._creationTime < event._creationTime ||
        !order.paymentReference ||
        !order.billingOrderReference
      )
        return createResultError(op, "Exact test order/event ownership cannot be proven")
      return createResult({
        paymentReference: order.paymentReference,
        orderReference: order.billingOrderReference,
        status: order.status,
        paymentStatus: order.paymentStatus,
      })
    }),
})
