import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketFulfillmentWorkSnapshotCreate } from "./ticketFulfillmentWorkSnapshotCreate.js"

export async function ticketFulfillmentWorkEnsure(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
  billingOrderReference: string,
): PromiseResult<{ workId: Id<"ticketFulfillmentWork">; created: boolean }> {
  const op = "ticketFulfillmentWorkEnsure"
  const order = await ctx.db.get(orderId)
  if (!order) return createResultError(op, "The order was not found")
  if (order.status !== "paid" || order.paymentStatus !== "paid" || order.fulfillmentEligible !== true)
    return createResultError(op, "The order is not eligible for fulfillment")

  const existing = await ctx.db
    .query("ticketFulfillmentWork")
    .withIndex("orderId", (q) => q.eq("orderId", orderId))
    .first()
  if (
    existing &&
    (existing.paymentReference !== order.paymentReference || existing.billingOrderReference !== billingOrderReference)
  )
    return createResultError(op, "The fulfillment work correlation does not match the order")
  if (existing) return createResult({ workId: existing._id, created: false })

  const snapshot = await ticketFulfillmentWorkSnapshotCreate(ctx, orderId, billingOrderReference)
  if (!snapshot.success) return snapshot
  const now = new Date().toISOString()
  const workId = await ctx.db.insert("ticketFulfillmentWork", {
    orderId,
    paymentReference: snapshot.data.paymentReference,
    billingOrderReference,
    stripeMode: order.stripeMode,
    requestSnapshotJson: JSON.stringify(snapshot.data),
    status: "pending",
    attemptCount: 0,
    nextAttemptAt: Date.now(),
    createdAt: now,
    updatedAt: now,
  })
  return createResult({ workId, created: true })
}
