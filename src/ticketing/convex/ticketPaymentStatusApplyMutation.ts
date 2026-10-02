import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketMaxPerOrder } from "../ticketMaxPerOrder.js"
import { ticketAccessDigestCreate } from "./ticketAccessDigestCreate.js"
import { ticketFulfillmentWorkEnsure } from "./ticketFulfillmentWorkEnsure.js"
import { ticketIssuedCountRead } from "./ticketIssuedCountRead.js"
import { ticketOrderAccessCapabilityEnsure } from "./ticketOrderAccessCapabilityEnsure.js"
import { ticketReservationsRelease } from "./ticketReservationsRelease.js"

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

    const ticketCount = await ticketIssuedCountRead(ctx, order._id)
    if (!ticketCount.success) return ticketCount

    const now = new Date().toISOString()
    const bookingNumber = Number.isSafeInteger(args.bookingNumber) ? args.bookingNumber : undefined
    const bookingReference = args.bookingReference?.trim() ? args.bookingReference : undefined
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
      await ctx.db.patch("ticketOrders", order._id, {
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
      return createResult({
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ticketCount: ticketCount.data,
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

    if (order.status === "paid") {
      const capability = await ticketOrderAccessCapabilityEnsure(ctx, order._id)
      if (!capability.success) return capability
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
      await ctx.db.patch("ticketOrders", order._id, {
        status: "paid_inventory_conflict",
        paymentStatus: "paid",
        billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
        bookingNumber: order.bookingNumber ?? bookingNumber,
        bookingReference: order.bookingReference ?? bookingReference,
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

    // Checkout creates one line/reservation per unique tier, with total quantity <= ticketMaxPerOrder.
    // The extra row is an overflow sentinel: no transition ever processes a truncated order.
    const reservations = await ctx.db
      .query("ticketReservations")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(ticketMaxPerOrder + 1)
    const activeReservations = reservations.filter((reservation) => reservation.status === "active")
    const lines = await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(ticketMaxPerOrder + 1)
    if (
      reservations.length > ticketMaxPerOrder ||
      lines.length > ticketMaxPerOrder ||
      reservations.some((reservation) => !Number.isSafeInteger(reservation.quantity) || reservation.quantity < 1) ||
      reservations.reduce((total, reservation) => total + reservation.quantity, 0) > ticketMaxPerOrder ||
      lines.some((line) => !Number.isSafeInteger(line.quantity) || line.quantity < 1) ||
      lines.reduce((total, line) => total + line.quantity, 0) > ticketMaxPerOrder
    )
      return createResultError(op, "Order lines or reservations exceed the order maximum")
    if (
      lines.length === 0 ||
      reservations.length !== lines.length ||
      activeReservations.length !== lines.length ||
      new Set(lines.map((line) => line.tierId)).size !== lines.length ||
      new Set(activeReservations.map((reservation) => reservation.tierId)).size !== activeReservations.length ||
      lines.some(
        (line) =>
          !activeReservations.some(
            (reservation) => reservation.tierId === line.tierId && reservation.quantity === line.quantity,
          ),
      )
    )
      return createResultError(op, "Paid inventory reservation is incomplete")
    if (ticketCount.data !== 0) return createResultError(op, "An unpaid order already has issued tickets")
    const participantNamesByTier = new Map(
      activeReservations.map((reservation) => [reservation.tierId, reservation.participantNamesJson]),
    )

    let hasCapacityConflict = false
    const tiers = new Map<Id<"catalogTicketTiers">, Doc<"catalogTicketTiers">>()
    for (const reservation of activeReservations) {
      const tier = await ctx.db.get("catalogTicketTiers", reservation.tierId)
      if (
        !tier ||
        !Number.isSafeInteger(tier.reserved) ||
        tier.reserved < reservation.quantity ||
        !Number.isSafeInteger(tier.sold) ||
        tier.sold < 0 ||
        !Number.isSafeInteger(tier.capacity) ||
        tier.capacity < 0
      )
        return createResultError(op, "Paid inventory reservation is corrupt")
      tiers.set(tier._id, tier)
      if (tier.sold + reservation.quantity > tier.capacity) hasCapacityConflict = true
    }
    if (hasCapacityConflict) {
      const release = await ticketReservationsRelease(ctx, order._id, now)
      if (!release.success) return release
      await ctx.db.patch("ticketOrders", order._id, {
        status: "paid_inventory_conflict",
        paymentStatus: "paid",
        billingOrderReference: order.billingOrderReference ?? args.billingOrderReference,
        bookingNumber: order.bookingNumber ?? bookingNumber,
        bookingReference: order.bookingReference ?? bookingReference,
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

    // Preflight every fallible Result operation before inventory/ticket writes (Result errors commit writes).
    const delivery = await ctx.db
      .query("ticketOrderDeliveries")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .first()
    const accessToken =
      delivery?.accessTokenSnapshot ??
      `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`
    const accessDigest = await ticketAccessDigestCreate(accessToken)
    if (!accessDigest.success) return accessDigest
    const codes = new Set<string>()
    for (let index = 0; index < lines.reduce((total, line) => total + line.quantity, 0); index += 1) {
      const code = await ticketIssuedCodeCreate(ctx, codes)
      if (!code.success) return code
      codes.add(code.data)
    }
    for (const reservation of activeReservations) {
      const tier = tiers.get(reservation.tierId)!
      await ctx.db.patch("catalogTicketTiers", tier._id, {
        reserved: tier.reserved - reservation.quantity,
        sold: tier.sold + reservation.quantity,
      })
      await ctx.db.patch("ticketReservations", reservation._id, { status: "consumed" })
    }
    const ticketCodes = [...codes]
    let sequence = 0
    for (const line of lines.sort((left, right) => left.tierKey.localeCompare(right.tierKey))) {
      const participantNames =
        participantNamesRead(line.participantNamesJson) ?? participantNamesRead(participantNamesByTier.get(line.tierId))
      for (let index = 0; index < line.quantity; index += 1) {
        sequence += 1
        await ctx.db.insert("ticketIssued", {
          orderId: order._id,
          sequence,
          ownerUserId: order.ownerUserId,
          guestAccessDigest: order.guestAccessDigest,
          code: ticketCodes[sequence - 1]!,
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
      bookingNumber: order.bookingNumber ?? bookingNumber,
      bookingReference: order.bookingReference ?? bookingReference,
      paidAt: now,
      emailAccessDigest: accessDigest.data,
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
    if (!delivery)
      await ctx.db.insert("ticketOrderDeliveries", {
        orderId: order._id,
        accessTokenSnapshot: accessToken,
        createdAt: now,
        updatedAt: now,
      })
    await ticketFulfillmentWorkScheduleIfEligible(ctx, order._id, order.fulfillmentEligible, args.billingOrderReference)
    return createResult({ orderId: order._id, status: "paid", paymentStatus: "paid", ticketCount: sequence })
  },
})

async function ticketIssuedCodeCreate(ctx: MutationCtx, plannedCodes: ReadonlySet<string>): PromiseResult<string> {
  const op = "ticketIssuedCodeCreate"
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `TKT-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`
    if (plannedCodes.has(code)) continue
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
