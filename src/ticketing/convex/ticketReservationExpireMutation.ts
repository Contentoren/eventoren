import { v } from "convex/values"
import type { Doc } from "#convex/_generated/dataModel.js"
import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketIssuedCountRead } from "./ticketIssuedCountRead.js"
import { ticketOrderTicketsCancel } from "./ticketOrderTicketsCancel.js"
import { ticketReservationsRelease } from "./ticketReservationsRelease.js"

type TicketReservationExpireData = {
  orderId: string
  status: "reserved" | "checkout_created" | "paid" | "failed" | "expired" | "released" | "paid_inventory_conflict"
  paymentStatus: "pending" | "paid" | "failed" | "expired"
  ticketCount: number
  expired: boolean
  released: boolean
  paid: boolean
}

export const ticketReservationExpireMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
    billingOrderReference: v.string(),
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    reason: v.string(),
    // Trusted evidence: the payment provider confirmed THIS correlated payment as
    // expired. Only the expire action may claim it after such a provider response.
    // A local timer, a checkout creation, a redirect or an unknown payment status
    // must never set it.
    paymentConfirmedExpired: v.optional(v.boolean()),
  },
  handler: async (ctx, args): PromiseResult<TicketReservationExpireData> => {
    const op = "ticketReservationExpireMutation"
    const order = await ctx.db.get("ticketOrders", args.orderId)
    if (!order) return createResultError(op, "The order was not found")
    if (
      order.paymentReference !== args.paymentReference ||
      order.stripeMode !== args.stripeMode ||
      (order.billingOrderReference !== undefined && order.billingOrderReference !== args.billingOrderReference)
    )
      return createResultError(op, "The payment correlation does not match the order")

    const ticketCount = await ticketIssuedCountRead(ctx, order._id)
    if (!ticketCount.success) return ticketCount

    if (order.status === "paid" || order.paymentStatus === "paid")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
        expired: false,
        released: false,
        paid: true,
      })
    if (order.status === "expired")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
        expired: true,
        released: false,
        paid: false,
      })
    if (order.status === "failed" || order.status === "released" || order.status === "paid_inventory_conflict")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
        expired: false,
        released: false,
        paid: false,
      })
    if (order.paymentStatus !== "pending")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
        expired: false,
        released: false,
        paid: false,
      })

    // A processing debit is no longer an unfinished Checkout. The original reservation
    // timer must not expire it, even when the rollout gate is disabled again.
    if (order.ticketsIssuedAt !== undefined && ticketCount.data > 0) {
      // Without a provider-confirmed expiry the safeguard stays: an early issuance
      // is never freed by a local timer or an unknown payment status.
      if (args.paymentConfirmedExpired !== true)
        return createResult({
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          ticketCount: ticketCount.data,
          expired: false,
          released: false,
          paid: false,
        })
      return await ticketReservationExpiredIssuedApply(ctx, order, args, ticketCount.data)
    }
    if (ticketCount.data !== 0) return createResultError(op, "An unpaid order already has issued tickets")
    const now = new Date().toISOString()
    const attempt = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("paymentReference", (q) => q.eq("paymentReference", order.paymentReference))
      .unique()
    if (attempt && attempt.orderId !== order._id)
      return createResultError(op, "The payment attempt does not belong to the order")
    const releaseResult = await ticketReservationsRelease(ctx, order._id, now)
    if (!releaseResult.success) return releaseResult
    await ctx.db.patch("ticketOrders", order._id, {
      status: "expired",
      expireErrorDeferralCount: undefined,
      expireAttentionSince: undefined,
      paymentStatus: "expired",
      billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
      releasedAt: now,
      lastPaymentCheckAt: now,
      checkoutAttemptLeaseUntil: undefined,
      lastPaymentError: args.reason.slice(0, 500),
      updatedAt: now,
    })
    if (attempt)
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        billingOrderReference: args.billingOrderReference,
        status: "expired",
        lastCheckedAt: now,
        updatedAt: now,
      })
    return createResult({
      orderId: order._id,
      status: "expired",
      paymentStatus: "expired",
      ticketCount: 0,
      expired: true,
      released: true,
      paid: false,
    })
  },
})

/**
 * A provider-confirmed expiry of an early-issued, still unpaid order: the own
 * activation code becomes reservable again and the early tickets lose their
 * validity. Paid, refunded or disputed orders never reach this path.
 */
async function ticketReservationExpiredIssuedApply(
  ctx: MutationCtx,
  order: Doc<"ticketOrders">,
  args: { readonly billingOrderReference: string; readonly reason: string },
  ticketCount: number,
): PromiseResult<TicketReservationExpireData> {
  const op = "ticketReservationExpireMutation"
  // A recorded cancellation is settled evidence of its own and never an unpaid expiry.
  if (order.cancellation !== undefined) return createResultError(op, "The order already carries cancellation evidence")
  const attempt = await ctx.db
    .query("ticketPaymentAttempts")
    .withIndex("paymentReference", (q) => q.eq("paymentReference", order.paymentReference))
    .unique()
  if (attempt && attempt.orderId !== order._id)
    return createResultError(op, "The payment attempt does not belong to the order")
  const now = new Date().toISOString()
  // The own code of this definitively unpaid order is freed and the early tickets
  // are cancelled. Inventory is never restocked: the early issuance already sold
  // these tickets.
  const releaseResult = await ticketReservationsRelease(ctx, order._id, now)
  if (!releaseResult.success) return releaseResult
  await ticketOrderTicketsCancel(ctx, order._id, now)
  await ctx.db.patch("ticketOrders", order._id, {
    status: "expired",
    expireErrorDeferralCount: undefined,
    expireAttentionSince: undefined,
    paymentStatus: "expired",
    billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
    releasedAt: now,
    lastPaymentCheckAt: now,
    checkoutAttemptLeaseUntil: undefined,
    lastPaymentError: args.reason.slice(0, 500),
    updatedAt: now,
  })
  if (attempt)
    await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
      billingOrderReference: args.billingOrderReference,
      status: "expired",
      lastCheckedAt: now,
      updatedAt: now,
    })
  return createResult({
    orderId: order._id,
    status: "expired",
    paymentStatus: "expired",
    ticketCount,
    expired: true,
    released: true,
    paid: false,
  })
}
