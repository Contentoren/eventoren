import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketFulfillmentWorkSnapshotCreate } from "./ticketFulfillmentWorkSnapshotCreate.js"
import { ticketFulfillmentWorkEligible } from "./ticketFulfillmentWorkEligible.js"
import type { TicketFulfillmentWorkSnapshot } from "./ticketFulfillmentWorkSnapshotCreate.js"

export async function ticketFulfillmentWorkEnsure(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
  billingOrderReference: string,
  deliveryMode: "tickets_only" | "paid" = "paid",
): PromiseResult<{
  workId: Id<"ticketFulfillmentWork">
  created: boolean
  promoted: boolean
  deliveryMode: "tickets_only" | "paid"
}> {
  const op = "ticketFulfillmentWorkEnsure"
  const order = await ctx.db.get("ticketOrders", orderId)
  if (!order) return createResultError(op, "The order was not found")
  if (!ticketFulfillmentWorkEligible(order, deliveryMode))
    return createResultError(op, "The order is not eligible for fulfillment")

  const existing = await ctx.db
    .query("ticketFulfillmentWork")
    .withIndex("orderId", (q) => q.eq("orderId", orderId))
    .unique()
  if (
    existing &&
    (existing.paymentReference !== order.paymentReference || existing.billingOrderReference !== billingOrderReference)
  )
    return createResultError(op, "The fulfillment work correlation does not match the order")
  if (existing?.cancelledAt !== undefined) return createResultError(op, "The fulfillment work was cancelled")
  if (existing) {
    const existingMode = existing.deliveryMode ?? "paid"
    if (existingMode !== "tickets_only" || deliveryMode !== "paid")
      return createResult({ workId: existing._id, created: false, promoted: false, deliveryMode: existingMode })
    let snapshot: TicketFulfillmentWorkSnapshot
    try {
      snapshot = JSON.parse(existing.requestSnapshotJson) as TicketFulfillmentWorkSnapshot
    } catch (error) {
      return createResultError(op, "The fulfillment snapshot is invalid", String(error))
    }
    // Never rebuild from mutable order/catalog/ticket data during paid promotion.
    await ctx.db.patch("ticketFulfillmentWork", existing._id, {
      deliveryMode: "paid",
      requestSnapshotJson: JSON.stringify({ ...snapshot, deliveryMode: "paid" }),
      status: "pending",
      attemptCount: 0,
      nextAttemptAt: Date.now(),
      leaseUntil: undefined,
      preparedAt: undefined,
      lastError: undefined,
      updatedAt: new Date().toISOString(),
    })
    return createResult({ workId: existing._id, created: false, promoted: true, deliveryMode: "paid" })
  }

  const snapshot = await ticketFulfillmentWorkSnapshotCreate(ctx, orderId, billingOrderReference, deliveryMode)
  if (!snapshot.success) return snapshot
  const now = new Date().toISOString()
  const workId = await ctx.db.insert("ticketFulfillmentWork", {
    orderId,
    paymentReference: snapshot.data.paymentReference,
    billingOrderReference,
    stripeMode: order.stripeMode,
    deliveryMode,
    requestSnapshotJson: JSON.stringify(snapshot.data),
    status: "pending",
    attemptCount: 0,
    nextAttemptAt: Date.now(),
    createdAt: now,
    updatedAt: now,
  })
  return createResult({ workId, created: true, promoted: false, deliveryMode })
}
