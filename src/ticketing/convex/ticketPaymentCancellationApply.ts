import * as a from "valibot"
import { eventorenTicketCheckoutCancellationSchema } from "billing/contracts/eventorenTicketCheckoutCancellationSchema"
import type { Doc } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { ticketReservationsRelease } from "./ticketReservationsRelease.js"

/** One transaction for callback and status recovery. All Result preflights precede writes. */
export async function ticketPaymentCancellationApply(
  ctx: MutationCtx,
  order: Doc<"ticketOrders">,
  input: a.InferOutput<typeof eventorenTicketCheckoutCancellationSchema>,
) {
  const op = "ticketPaymentCancellationApply"
  const parsed = a.safeParse(eventorenTicketCheckoutCancellationSchema, input)
  if (!parsed.success) return createResultError(op, "The cancellation evidence is invalid")
  if (
    input.organizationId !== parsed.output.organizationId ||
    input.eventKey !== parsed.output.eventKey ||
    input.orderReference !== parsed.output.orderReference
  )
    return createResultError(op, "The cancellation identity must match exactly")
  const cancellation = parsed.output
  const organizationId = process.env.EVENTOREN_BILLING_ORGANIZATION_ID
  const stripeMode = process.env.EVENTOREN_BILLING_STRIPE_MODE
  if (!organizationId || (stripeMode !== "test" && stripeMode !== "live"))
    return createResultError(op, "The payment outcome receiver is not configured")
  if (
    cancellation.organizationId !== organizationId ||
    cancellation.stripeMode !== stripeMode ||
    cancellation.stripeMode !== order.stripeMode ||
    cancellation.eventKey !== order.eventKey ||
    cancellation.orderReference !== order.billingOrderReference ||
    cancellation.paymentReference !== order.paymentReference ||
    (order.paymentMethodType !== undefined && order.paymentMethodType !== "sepa_debit") ||
    (order.stripePaymentIntentId !== undefined && order.stripePaymentIntentId !== cancellation.stripePaymentIntentId)
  )
    return createResultError(op, "The cancellation correlation does not match the order")
  const attempt = await ctx.db
    .query("ticketPaymentAttempts")
    .withIndex("paymentReference", (q) => q.eq("paymentReference", cancellation.paymentReference))
    .unique()
  if (
    !attempt ||
    attempt.orderId !== order._id ||
    attempt.stripeMode !== order.stripeMode ||
    attempt.billingOrderReference !== cancellation.orderReference
  )
    return createResultError(op, "The cancellation payment attempt does not match")
  // Checkout creation persists Stripe's URL, not a separate session ID. Bind authenticated
  // PI evidence to that existing session before storing a previously unknown PI.
  const sessionId = order.stripeSessionId ?? sessionIdRead(order.checkoutUrl)
  if (
    !sessionId ||
    sessionId !== cancellation.stripeSessionId ||
    (attempt.checkoutUrl !== undefined && sessionIdRead(attempt.checkoutUrl) !== sessionId) ||
    (order.checkoutUrl !== undefined && sessionIdRead(order.checkoutUrl) !== sessionId)
  )
    return createResultError(op, "The cancellation session does not match the checkout")
  const eventOwner = await ctx.db
    .query("ticketOrders")
    .withIndex("cancellationStripeEventId", (q) => q.eq("cancellation.stripeEventId", cancellation.stripeEventId))
    .unique()
  if (eventOwner && eventOwner._id !== order._id)
    return createResultError(op, "The cancellation event belongs to another order")
  if (order.cancellation) {
    const first = order.cancellation
    if (
      first.organizationId !== cancellation.organizationId ||
      first.eventKey !== cancellation.eventKey ||
      first.orderReference !== cancellation.orderReference ||
      first.paymentReference !== cancellation.paymentReference ||
      first.stripeMode !== cancellation.stripeMode ||
      first.stripeSessionId !== cancellation.stripeSessionId ||
      first.stripePaymentIntentId !== cancellation.stripePaymentIntentId ||
      (first.stripeChargeId !== null &&
        cancellation.stripeChargeId !== null &&
        first.stripeChargeId !== cancellation.stripeChargeId) ||
      (first.stripeDisputeId !== null &&
        cancellation.stripeDisputeId !== null &&
        first.stripeDisputeId !== cancellation.stripeDisputeId) ||
      (first.stripeEventId === cancellation.stripeEventId &&
        Object.keys(first).some(
          (key) => first[key as keyof typeof first] !== cancellation[key as keyof typeof cancellation],
        ))
    )
      return createResultError(op, "The cancellation replay evidence conflicts")
    return createResult({ orderId: order._id, replayed: true })
  }
  // Complete per-order sets, bounded by checkout transaction size; never truncate tickets.
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", order._id))
    .collect()
  const works = await ctx.db
    .query("ticketFulfillmentWork")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .collect()
  const now = new Date().toISOString()
  const released = await ticketReservationsRelease(ctx, order._id, now)
  if (!released.success) return released
  for (const ticket of tickets) await ctx.db.patch("ticketIssued", ticket._id, { cancelled: true })
  for (const work of works)
    await ctx.db.patch("ticketFulfillmentWork", work._id, {
      cancelledAt: now,
      leaseUntil: undefined,
      nextAttemptAt: Number.MAX_SAFE_INTEGER,
      status: work.status === "preparing" ? "pending" : work.status,
      updatedAt: now,
    })
  await ctx.db.patch("ticketOrders", order._id, {
    cancellation,
    stripeSessionId: sessionId,
    stripePaymentIntentId: cancellation.stripePaymentIntentId,
    paymentMethodType: "sepa_debit",
    // A SEPA dispute is not a refund or a reversal of the original paid truth.
    ...(cancellation.reason === "payment_failed" && order.paymentStatus !== "paid"
      ? { status: "failed" as const, paymentStatus: "failed" as const }
      : {}),
    checkoutAttemptLeaseUntil: undefined,
    updatedAt: now,
  })
  if (cancellation.reason === "payment_failed" && order.paymentStatus !== "paid")
    await ctx.db.patch("ticketPaymentAttempts", attempt._id, { status: "failed", updatedAt: now })
  console.info("Ticket payment cancellation applied", { orderId: order._id, stripeEventId: cancellation.stripeEventId })
  return createResult({ orderId: order._id, replayed: false })
}

function sessionIdRead(checkoutUrl: string | undefined) {
  if (!checkoutUrl) return undefined
  try {
    const url = new URL(checkoutUrl)
    if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") return undefined
    return /^\/c\/pay\/(cs_(?:test_|live_)?[A-Za-z0-9_]+)(?:\/|$)/u.exec(url.pathname)?.[1]
  } catch {
    return undefined
  }
}
