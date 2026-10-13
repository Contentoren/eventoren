import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import type { Doc } from "#convex/_generated/dataModel.js"
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
      const event = await authorizedCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
        .unique()
      if (
        !order ||
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
        order._creationTime < event._creationTime
      )
        return createResultError(op, "Exact test order/event ownership cannot be proven")
      if (!order.paymentReference || !order.billingOrderReference)
        return createResultError(op, "Saved order payment/Billing references missing")
      // Complete indexed discovery up to a fixed bound; never infer absence
      // from a truncated prefix. Old failed preparations need not have a
      // Billing reference, but must prove the same customer and terminal state.
      const matching = await authorizedCtx.db
        .query("ticketOrders")
        .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", eventKey))
        .take(101)
      if (matching.length > 100) return createResultError(op, "Exact event order discovery exceeds proof bound")
      const historyOwned = (previous: Doc<"ticketOrders">) =>
        previous.eventTitle === event.title &&
        previous.organizer === event.organizer &&
        previous.customerGivenName === "E2E" &&
        previous.customerFamilyName === runId &&
        previous.customerEmail === order.customerEmail &&
        previous.ownerUserId === order.ownerUserId &&
        previous.stripeMode === "test" &&
        previous._creationTime >= event._creationTime &&
        previous._creationTime < order._creationTime &&
        Date.parse(previous.createdAt) >= runCreatedAt &&
        Date.parse(previous.createdAt) <= Date.parse(order.createdAt) &&
        ["released", "expired", "failed"].includes(previous.status) &&
        ["expired", "failed"].includes(previous.paymentStatus) &&
        !previous.paidAt &&
        !!previous.releasedAt &&
        (!previous.checkoutAttemptLeaseUntil || previous.checkoutAttemptLeaseUntil <= Date.now()) &&
        !!previous.paymentReference &&
        previous.paymentReference !== order.paymentReference &&
        (!previous.billingOrderReference || previous.billingOrderReference !== order.billingOrderReference) &&
        (!previous.checkoutUrl || previous.checkoutUrl !== order.checkoutUrl)
      if (matching.some((candidate) => candidate._id !== id && !historyOwned(candidate)))
        return createResultError(op, "Other active or uncorrelated event order conflicts with saved proof")
      return createResult({
        paymentReference: order.paymentReference,
        orderReference: order.billingOrderReference,
        status: order.status,
        paymentStatus: order.paymentStatus,
      })
    }),
})
