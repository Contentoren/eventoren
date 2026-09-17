import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketFulfillmentWorkEnsure } from "./ticketFulfillmentWorkEnsure.js"
import { ticketOrderAccessCapabilityEnsure } from "./ticketOrderAccessCapabilityEnsure.js"

const paymentStatusValidator = v.union(v.literal("pending"), v.literal("paid"), v.literal("failed"))

export const ticketPaymentStatusApplyMutation = internalMutation({
  args: {
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
    billingOrderReference: v.string(),
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    payment: paymentStatusValidator,
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
    const order = await ctx.db.get(args.orderId)
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

    const now = new Date().toISOString()
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
          ticketCount: await ticketCountGet(ctx, order._id),
        })
      await ctx.db.patch("ticketOrders", order._id, {
        billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
        lastPaymentCheckAt: now,
        checkoutAttemptLeaseUntil: undefined,
        updatedAt: now,
      })
      await ctx.db.patch("ticketPaymentAttempts", attempt._id, {
        billingOrderReference: args.billingOrderReference,
        status: order.status === "checkout_created" ? "checkout_created" : "pending",
        lastCheckedAt: now,
        updatedAt: now,
      })
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: await ticketCountGet(ctx, order._id),
      })
    }

    if (args.payment === "failed") {
      if (order.status === "paid")
        return createResult({
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          ticketCount: await ticketCountGet(ctx, order._id),
        })
      if (order.status === "expired")
        return createResult({
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          ticketCount: await ticketCountGet(ctx, order._id),
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
          ticketCount: await ticketCountGet(ctx, order._id),
        })
      }
      const reservations = await ctx.db
        .query("ticketReservations")
        .withIndex("orderId", (q) => q.eq("orderId", order._id))
        .collect()
      for (const reservation of reservations) {
        if (reservation.status !== "active") continue
        const tier = await ctx.db.get(reservation.tierId)
        if (!tier || tier.reserved < reservation.quantity) return createResultError(op, "Reserved inventory is corrupt")
        await ctx.db.patch("catalogTicketTiers", tier._id, { reserved: tier.reserved - reservation.quantity })
        await ctx.db.patch("ticketReservations", reservation._id, {
          status: "released",
          releasedAt: now,
        })
      }
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

    if (order.status === "paid") {
      const capability = await ticketOrderAccessCapabilityEnsure(ctx, order._id)
      if (!capability.success) return capability
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
        ticketCount: await ticketCountGet(ctx, order._id),
      })
    }
    if (
      order.status === "failed" ||
      order.status === "expired" ||
      order.status === "released" ||
      order.status === "paid_inventory_conflict"
    ) {
      await ctx.db.patch("ticketOrders", order._id, {
        status: "paid_inventory_conflict",
        paymentStatus: "paid",
        billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
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
        ticketCount: await ticketCountGet(ctx, order._id),
      })
    }

    const reservations = await ctx.db
      .query("ticketReservations")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .collect()
    const activeReservations = reservations.filter((reservation) => reservation.status === "active")
    const lines = await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .collect()
    if (activeReservations.length !== lines.length)
      return createResultError(op, "Paid inventory reservation is incomplete")
    const participantNamesByTier = new Map(
      activeReservations.map((reservation) => [reservation.tierId, reservation.participantNamesJson]),
    )

    for (const reservation of activeReservations) {
      const tier = await ctx.db.get(reservation.tierId)
      if (!tier || tier.reserved < reservation.quantity)
        return createResultError(op, "Paid inventory reservation is corrupt")
      await ctx.db.patch("catalogTicketTiers", tier._id, {
        reserved: tier.reserved - reservation.quantity,
        sold: tier.sold + reservation.quantity,
      })
      await ctx.db.patch("ticketReservations", reservation._id, { status: "consumed" })
    }

    let sequence = 0
    const existingTickets = await ctx.db
      .query("ticketIssued")
      .withIndex("orderIdAndSequence", (q) => q.eq("orderId", order._id))
      .collect()
    sequence = existingTickets.length
    for (const line of lines.sort((left, right) => left.tierKey.localeCompare(right.tierKey))) {
      const participantNames =
        participantNamesRead(line.participantNamesJson) ?? participantNamesRead(participantNamesByTier.get(line.tierId))
      for (let index = 0; index < line.quantity; index += 1) {
        sequence += 1
        const codeResult = await ticketIssuedCodeCreate(ctx)
        if (!codeResult.success) return codeResult
        await ctx.db.insert("ticketIssued", {
          orderId: order._id,
          sequence,
          ownerUserId: order.ownerUserId,
          guestAccessDigest: order.guestAccessDigest,
          code: codeResult.data,
          eventKey: order.eventKey,
          eventTitle: order.eventTitle,
          eventStartsAt: order.eventStartsAt,
          eventDoorsAt: order.eventDoorsAt,
          venue: order.venue,
          city: order.city,
          address: order.address,
          tierKey: line.tierKey,
          tierName: line.tierName,
          priceCents: line.priceCents,
          feeCents: line.feeCents,
          ...(participantNames?.[index] !== undefined ? { participantName: participantNames[index] } : {}),
          issuedAt: now,
        })
      }
    }
    await ctx.db.patch("ticketOrders", order._id, {
      status: "paid",
      paymentStatus: "paid",
      billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
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
    const capability = await ticketOrderAccessCapabilityEnsure(ctx, order._id)
    if (!capability.success) return capability
    await ticketFulfillmentWorkScheduleIfEligible(ctx, order._id, order.fulfillmentEligible, args.billingOrderReference)
    return createResult({ orderId: order._id, status: "paid", paymentStatus: "paid", ticketCount: sequence })
  },
})

async function ticketIssuedCodeCreate(ctx: MutationCtx): PromiseResult<string> {
  const op = "ticketIssuedCodeCreate"
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `TKT-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`
    const existing = await ctx.db
      .query("ticketIssued")
      .withIndex("code", (q) => q.eq("code", code))
      .first()
    if (!existing) return createResult(code)
  }
  return createResultError(op, "Could not generate a unique ticket code")
}

async function ticketFulfillmentWorkScheduleIfEligible(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
  fulfillmentEligible: boolean | undefined,
  billingOrderReference: string | undefined,
) {
  if (fulfillmentEligible !== true || billingOrderReference === undefined) return
  const work = await ticketFulfillmentWorkEnsure(ctx, orderId, billingOrderReference)
  if (!work.success || !work.data.created) return
  await ctx.scheduler.runAfter(0, internal.ticketing.ticketFulfillmentPrepareAction, { workId: work.data.workId })
}

async function ticketCountGet(ctx: MutationCtx, orderId: Id<"ticketOrders">) {
  return await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", orderId))
    .collect()
    .then((tickets) => tickets.length)
}

function participantNamesRead(value: string | undefined): readonly string[] | undefined {
  if (value === undefined) return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || parsed.some((name) => typeof name !== "string" || name.trim().length === 0))
      return undefined
    return parsed
  } catch {
    return undefined
  }
}
