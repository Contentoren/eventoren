import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketFulfillmentWorkEnsure } from "./ticketFulfillmentWorkEnsure.js"
import { ticketIssuedCountRead } from "./ticketIssuedCountRead.js"
import { ticketOrderAccessCapabilityEnsure } from "./ticketOrderAccessCapabilityEnsure.js"
import { ticketReservationsRelease } from "./ticketReservationsRelease.js"
import { ticketActivationCodeLifecyclePlan } from "./ticketActivationCodeLifecyclePlan.js"
import { ticketActivationCodeLifecycleApply } from "./ticketActivationCodeLifecycleApply.js"
import { ticketOrderTicketsIssue } from "./ticketOrderTicketsIssue.js"
import { ticketPaymentCancellationValidator } from "./ticketPaymentCancellationValidator.js"
import { ticketPaymentCancellationApply } from "./ticketPaymentCancellationApply.js"

const paymentStatusValidator = v.union(v.literal("pending"), v.literal("paid"), v.literal("failed"))
export const ticketPaymentStatusApplyMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
    billingOrderReference: v.string(),
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    payment: paymentStatusValidator,
    bookingNumber: v.optional(v.number()),
    bookingReference: v.optional(v.string()),
    checkoutCompletedAt: v.optional(v.union(v.string(), v.null())),
    paymentMethodType: v.optional(v.union(v.string(), v.null())),
    stripePaymentIntentStatus: v.optional(
      v.union(
        v.literal("requires_payment_method"),
        v.literal("requires_confirmation"),
        v.literal("requires_action"),
        v.literal("processing"),
        v.literal("requires_capture"),
        v.literal("canceled"),
        v.literal("succeeded"),
        v.null(),
      ),
    ),
    cancellation: v.optional(v.union(ticketPaymentCancellationValidator, v.null())),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    orderId: string
    status: "reserved" | "checkout_created" | "paid" | "failed" | "expired" | "released" | "paid_inventory_conflict"
    paymentStatus: "pending" | "paid" | "failed" | "expired"
    ticketCount: number
  }> => {
    const op = "ticketPaymentStatusApplyMutation"
    const order = await ctx.db.get("ticketOrders", args.orderId)
    if (!order) return createResultError(op, "The order was not found")
    if (
      order.paymentReference !== args.paymentReference ||
      order.stripeMode !== args.stripeMode ||
      (order.billingOrderReference !== undefined && order.billingOrderReference !== args.billingOrderReference)
    )
      return createResultError(op, "The payment correlation does not match the order")

    const attempt = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("paymentReference", (q) => q.eq("paymentReference", args.paymentReference))
      .unique()
    if (!attempt || attempt.orderId !== order._id)
      return createResultError(op, "The payment attempt does not belong to the order")

    if (args.cancellation) {
      const cancellation = await ticketPaymentCancellationApply(ctx, order, args.cancellation)
      if (!cancellation.success) return cancellation
    }
    // Ticket cancellation is terminal, independently of financial settlement. Never
    // run issuance, activation-code consumption or fulfillment on a delayed success.
    if (order.cancellation || args.cancellation) {
      const cancelledOrder = await ctx.db.get("ticketOrders", order._id)
      if (!cancelledOrder) return createResultError(op, "The order was not found")
      const paymentStatus = args.payment === "paid" ? "paid" : cancelledOrder.paymentStatus
      const status = args.payment === "paid" ? "paid" : cancelledOrder.status
      const now = new Date().toISOString()
      await ctx.db.patch("ticketOrders", order._id, {
        status,
        paymentStatus,
        ...(args.payment === "paid"
          ? {
              paidAt: cancelledOrder.paidAt ?? now,
              bookingNumber: cancelledOrder.bookingNumber ?? args.bookingNumber,
              bookingReference: cancelledOrder.bookingReference ?? args.bookingReference,
              stripePaymentIntentStatus: "succeeded" as const,
            }
          : {}),
        lastPaymentCheckAt: now,
        updatedAt: now,
      })
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        ...(args.payment === "paid" ? { status: "paid" as const } : {}),
        lastCheckedAt: now,
        updatedAt: now,
      })
      const count = await ticketIssuedCountRead(ctx, order._id)
      if (!count.success) return count
      return createResult({ orderId: order._id, status, paymentStatus, ticketCount: count.data })
    }

    const ticketCount = await ticketIssuedCountRead(ctx, order._id)
    if (!ticketCount.success) return ticketCount

    const now = new Date().toISOString()
    const bookingNumber = Number.isSafeInteger(args.bookingNumber) ? args.bookingNumber : undefined
    const bookingReference = args.bookingReference?.trim() ? args.bookingReference : undefined
    const lifecycle = {
      checkoutCompletedAt: order.checkoutCompletedAt ?? args.checkoutCompletedAt ?? undefined,
      paymentMethodType: args.paymentMethodType ?? order.paymentMethodType,
      // Stale completion must not downgrade settled PaymentIntent evidence.
      stripePaymentIntentStatus:
        order.paymentStatus === "paid"
          ? order.stripePaymentIntentStatus
          : (args.stripePaymentIntentStatus ?? order.stripePaymentIntentStatus),
    }
    // Eligibility must arrive jointly in THIS trusted status response. Never assemble
    // partial/stale observations, infer completion from a redirect, or accept bank instructions.
    const earlyIssuanceEligible =
      process.env.EVENTOREN_SEPA_EARLY_TICKET_ISSUANCE_ENABLED === "true" &&
      args.payment === "pending" &&
      order.paymentStatus === "pending" &&
      typeof args.checkoutCompletedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T/u.test(args.checkoutCompletedAt) &&
      Number.isFinite(Date.parse(args.checkoutCompletedAt)) &&
      args.paymentMethodType === "sepa_debit" &&
      args.stripePaymentIntentStatus === "processing" &&
      args.cancellation == null
    if (args.payment === "pending") {
      if (
        order.status === "failed" ||
        order.status === "expired" ||
        order.status === "released" ||
        order.status === "paid_inventory_conflict"
      )
        return createResult({
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          ticketCount: ticketCount.data,
        })
      let issuedCount = ticketCount.data
      if (earlyIssuanceEligible) {
        const activationCodes = await ticketActivationCodeLifecyclePlan(ctx, order, "consume")
        if (!activationCodes.success) return activationCodes
        const issuance = await ticketOrderTicketsIssue(ctx, order, issuedCount, activationCodes.data, now)
        if (!issuance.success) return issuance
        if (issuance.data.inventoryConflict) return createResultError(op, "Processing SEPA inventory is unavailable")
        issuedCount = issuance.data.ticketCount
      }
      await ctx.db.patch("ticketOrders", order._id, {
        ...lifecycle,
        billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
        lastPaymentCheckAt: now,
        checkoutAttemptLeaseUntil: undefined,
        updatedAt: now,
      })
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        billingOrderReference: args.billingOrderReference,
        status:
          order.paymentStatus === "paid"
            ? "paid"
            : order.status === "checkout_created"
              ? "checkout_created"
              : "pending",
        lastCheckedAt: now,
        updatedAt: now,
      })
      if (earlyIssuanceEligible)
        await ticketFulfillmentWorkScheduleIfEligible(ctx, order._id, true, args.billingOrderReference, "tickets_only")
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: issuedCount,
      })
    }

    if (args.payment === "failed") {
      if (order.status === "paid" || order.paymentStatus === "paid")
        return createResult({
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          ticketCount: ticketCount.data,
        })
      if (order.status === "expired")
        return createResult({
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          ticketCount: ticketCount.data,
        })
      if (order.status === "released" || order.status === "paid_inventory_conflict") {
        await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
          billingOrderReference: args.billingOrderReference,
          status: "failed",
          lastCheckedAt: now,
          updatedAt: now,
        })
        return createResult({
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          ticketCount: ticketCount.data,
        })
      }
      if (ticketCount.data !== 0) return createResultError(op, "An unpaid order already has issued tickets")
      const release = await ticketReservationsRelease(ctx, order._id, now)
      if (!release.success) return release
      await ctx.db.patch("ticketOrders", order._id, {
        status: "failed",
        paymentStatus: "failed",
        billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
        releasedAt: now,
        lastPaymentCheckAt: now,
        checkoutAttemptLeaseUntil: undefined,
        updatedAt: now,
      })
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        billingOrderReference: args.billingOrderReference,
        status: "failed",
        lastCheckedAt: now,
        updatedAt: now,
      })
      return createResult({ orderId: order._id, status: "failed", paymentStatus: "failed", ticketCount: 0 })
    }

    const activationCodes = await ticketActivationCodeLifecyclePlan(ctx, order, "consume")
    if (!activationCodes.success) return activationCodes
    if (order.status === "paid") {
      if (activationCodes.data.hasOwnershipConflict)
        return createResultError(op, "A fulfilled order no longer owns its activation code")
      const capability = await ticketOrderAccessCapabilityEnsure(ctx, order._id)
      if (!capability.success) return capability
      await ctx.db.patch("ticketOrders", order._id, lifecycle)
      await ticketOrderBookingDetailsBackfill(ctx, order._id, order, { bookingNumber, bookingReference }, now)
      await ticketFulfillmentWorkScheduleIfEligible(
        ctx,
        order._id,
        order.fulfillmentEligible,
        order.billingOrderReference ?? args.billingOrderReference,
      )
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
      })
    }
    if (
      order.status === "failed" ||
      order.status === "expired" ||
      order.status === "released" ||
      order.status === "paid_inventory_conflict"
    ) {
      await ticketActivationCodeLifecycleApply(ctx, activationCodes.data, now)
      await ctx.db.patch("ticketOrders", order._id, {
        status: "paid_inventory_conflict",
        paymentStatus: "paid",
        billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
        bookingNumber: order.bookingNumber ?? bookingNumber,
        bookingReference: order.bookingReference ?? bookingReference,
        paidAt: order.paidAt ?? now,
        lastPaymentCheckAt: now,
        checkoutAttemptLeaseUntil: undefined,
        updatedAt: now,
      })
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        billingOrderReference: args.billingOrderReference,
        status: "paid",
        lastCheckedAt: now,
        updatedAt: now,
      })
      return createResult({
        orderId: order._id,
        status: "paid_inventory_conflict",
        paymentStatus: "paid",
        ticketCount: ticketCount.data,
      })
    }

    const issuance = await ticketOrderTicketsIssue(ctx, order, ticketCount.data, activationCodes.data, now)
    if (!issuance.success) return issuance
    if (issuance.data.inventoryConflict) {
      const release = await ticketReservationsRelease(ctx, order._id, now, "consume")
      if (!release.success) return release
      await ctx.db.patch("ticketOrders", order._id, {
        status: "paid_inventory_conflict",
        paymentStatus: "paid",
        billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
        bookingNumber: order.bookingNumber ?? bookingNumber,
        bookingReference: order.bookingReference ?? bookingReference,
        paidAt: order.paidAt ?? now,
        lastPaymentCheckAt: now,
        checkoutAttemptLeaseUntil: undefined,
        updatedAt: now,
      })
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        billingOrderReference: args.billingOrderReference,
        status: "paid",
        lastCheckedAt: now,
        updatedAt: now,
      })
      return createResult({
        orderId: order._id,
        status: "paid_inventory_conflict",
        paymentStatus: "paid",
        ticketCount: ticketCount.data,
      })
    }

    await ctx.db.patch("ticketOrders", order._id, {
      ...lifecycle,
      status: "paid",
      paymentStatus: "paid",
      billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
      bookingNumber: order.bookingNumber ?? bookingNumber,
      bookingReference: order.bookingReference ?? bookingReference,
      paidAt: now,
      lastPaymentCheckAt: now,
      checkoutAttemptLeaseUntil: undefined,
      updatedAt: now,
    })
    await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
      billingOrderReference: args.billingOrderReference,
      status: "paid",
      lastCheckedAt: now,
      updatedAt: now,
    })
    await ticketFulfillmentWorkScheduleIfEligible(ctx, order._id, order.fulfillmentEligible, args.billingOrderReference)
    return createResult({
      orderId: order._id,
      status: "paid",
      paymentStatus: "paid",
      ticketCount: issuance.data.ticketCount,
    })
  },
})

async function ticketFulfillmentWorkScheduleIfEligible(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
  fulfillmentEligible: boolean | undefined,
  billingOrderReference: string | undefined,
  deliveryMode: "tickets_only" | "paid" = "paid",
) {
  if (fulfillmentEligible !== true || billingOrderReference === undefined) return
  const work = await ticketFulfillmentWorkEnsure(ctx, orderId, billingOrderReference, deliveryMode)
  if (!work.success || (!work.data.created && !work.data.promoted)) return
  await ctx.scheduler.runAfter(0, internal.ticketing.ticketFulfillmentPrepareAction, { workId: work.data.workId })
}

async function ticketOrderBookingDetailsBackfill(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
  order: { bookingNumber?: number; bookingReference?: string },
  args: { bookingNumber?: number; bookingReference?: string },
  now: string,
) {
  const bookingNumber = order.bookingNumber ?? args.bookingNumber
  const bookingReference = order.bookingReference ?? args.bookingReference
  if (bookingNumber === order.bookingNumber && bookingReference === order.bookingReference) return
  await ctx.db.patch("ticketOrders", orderId, { bookingNumber, bookingReference, updatedAt: now })
}
