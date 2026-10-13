import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { internalQuery } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { TicketFulfillmentWorkSnapshot } from "./ticketFulfillmentWorkSnapshotCreate.js"
import { ticketFulfillmentWorkEligible } from "./ticketFulfillmentWorkEligible.js"

export const ticketFulfillmentWorkContextQuery = internalQuery({
  args: { workId: v.id("ticketFulfillmentWork") },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    workId: Id<"ticketFulfillmentWork">
    orderId: Id<"ticketOrders">
    accessToken: string
    snapshot: TicketFulfillmentWorkSnapshot
    onlineTicketUrl?: string
    stripeMode: "live" | "test"
    deliveryMode: "tickets_only" | "paid"
    status: "pending" | "preparing" | "prepared"
  }> => {
    const op = "ticketFulfillmentWorkContextQuery"
    const work = await ctx.db.get("ticketFulfillmentWork", args.workId)
    if (!work) return createResultError(op, "The fulfillment work was not found")
    if (work.cancelledAt !== undefined) return createResultError(op, "The fulfillment work was cancelled")
    const order = await ctx.db.get("ticketOrders", work.orderId)
    if (!order) return createResultError(op, "The fulfillment order was not found")
    const deliveryMode = work.deliveryMode ?? "paid"
    if (!ticketFulfillmentWorkEligible(order, deliveryMode))
      return createResultError(op, "The fulfillment order is no longer eligible")
    if (
      order.paymentReference !== work.paymentReference ||
      order.billingOrderReference !== work.billingOrderReference ||
      (work.stripeMode !== undefined && order.stripeMode !== work.stripeMode)
    )
      return createResultError(op, "The fulfillment order correlation does not match")
    if (order.emailAccessRevokedAt !== undefined)
      return createResultError(op, "The ticket access capability was revoked")
    let snapshot: TicketFulfillmentWorkSnapshot
    try {
      snapshot = JSON.parse(work.requestSnapshotJson) as TicketFulfillmentWorkSnapshot
    } catch (error) {
      return createResultError(op, "The fulfillment snapshot is invalid", String(error))
    }
    if ((snapshot.deliveryMode ?? "paid") !== deliveryMode)
      return createResultError(op, "The fulfillment snapshot mode does not match the work")
    // A ticket-level cancellation must also prevent outbound delivery.
    for (const ticket of snapshot.tickets) {
      const issued = await ctx.db.get("ticketIssued", ticket.ticketId as Id<"ticketIssued">)
      if (!issued || issued.orderId !== order._id || issued.cancelled === true)
        return createResultError(op, "The fulfillment ticket is missing or cancelled")
    }
    const delivery = await ctx.db
      .query("ticketOrderDeliveries")
      .withIndex("orderId", (q) => q.eq("orderId", work.orderId))
      .first()
    if (!delivery) return createResultError(op, "The ticket access capability was not found")
    return createResult({
      workId: work._id,
      orderId: work.orderId,
      accessToken: delivery.accessTokenSnapshot,
      snapshot,
      onlineTicketUrl: work.onlineTicketUrl,
      stripeMode: order.stripeMode,
      deliveryMode,
      status: work.status,
    })
  },
})
