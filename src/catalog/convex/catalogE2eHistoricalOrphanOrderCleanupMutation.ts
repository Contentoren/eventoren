import { v } from "convex/values"
import type { Doc } from "#convex/_generated/dataModel.js"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import {
  catalogE2eLegacyTechnicalCheckoutCheck,
  catalogE2eLegacyTechnicalCheckoutEventKey,
} from "./catalogE2eLegacyTechnicalCheckoutCheck.js"
import { catalogE2eRunMarkerExtract } from "./catalogE2eRunMarkerExtract.js"

const defaultStaleAfterMs = 24 * 60 * 60_000
const orderPageSize = 100
const childTake = 101

const argsValidator = v.object({
  token: v.string(),
  staleAfterMs: v.optional(v.number()),
  cursor: v.optional(v.string()),
})

export type CatalogE2eHistoricalOrphanOrderCleanupResult = {
  scannedOrders: number
  isDone: boolean
  continueCursor: string | null
  orphanOrdersDeleted: number
  orphanTicketsDeleted: number
}

/**
 * Authenticated sweep of orphaned E2E-marked orders whose catalog event row is
 * already gone: each stale, test-provider, marker-proven ticket-e2e order and
 * each approved exact technical-checkout orphan (test or live provider mode,
 * explicitly fictitious snapshot corroboration) is deleted with its lines,
 * payment attempts, deliveries, fulfillment work, reservations, issued tickets
 * and check-in history. One paginated order page per execution; the caller
 * repeats with continueCursor until isDone. Anything ambiguous, foreign or
 * live-provider outside the exact technical-checkout key is left untouched.
 * Stripe financial history is never refunded or deleted.
 */
export const catalogE2eHistoricalOrphanOrderCleanupMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogE2eHistoricalOrphanOrderCleanupAuthorized),
})

async function catalogE2eHistoricalOrphanOrderCleanupAuthorized(
  ctx: MutationCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<CatalogE2eHistoricalOrphanOrderCleanupResult> {
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const staleAfterMs =
    args.staleAfterMs === undefined || !Number.isFinite(args.staleAfterMs) || args.staleAfterMs < 0
      ? defaultStaleAfterMs
      : args.staleAfterMs
  const batch = await ctx.db.query("ticketOrders").paginate({ cursor: args.cursor ?? null, numItems: orderPageSize })
  const now = Date.now()
  let orphanOrdersDeleted = 0
  let orphanTicketsDeleted = 0
  for (const order of batch.page) {
    if (order.eventKey === catalogE2eLegacyTechnicalCheckoutEventKey) {
      if (order.status === "paid_inventory_conflict" || now - order._creationTime < staleAfterMs) continue
      if (order.stripeMode !== "test" && order.stripeMode !== "live") continue
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", order.eventKey))
        .unique()
      if (event) continue
      const fictitious = catalogE2eLegacyTechnicalCheckoutCheck({
        eventKey: order.eventKey,
        description: order.eventDescription,
      })
      if (!fictitious.success) continue
      const deleted = await catalogE2eTechnicalCheckoutOrphanOrderDelete(ctx, order)
      if (!deleted.success) continue
      orphanOrdersDeleted += 1
      orphanTicketsDeleted += deleted.data
      continue
    }
    if (
      order.customerGivenName !== "E2E" ||
      order.stripeMode !== "test" ||
      order.status === "paid_inventory_conflict" ||
      now - order._creationTime < staleAfterMs
    )
      continue
    if (!order.customerFamilyName) continue
    const runId = catalogE2eRunMarkerExtract(`ticket-e2e-${order.customerFamilyName}`)
    if (!runId.success) continue
    if (
      order.eventKey !== `ticket-e2e-${runId.data}` ||
      order.eventTitle !== `Ticket E2E ${runId.data}` ||
      order.organizer !== `Eventoren Ticket E2E ${runId.data}`
    )
      continue
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", order.eventKey))
      .unique()
    if (event) continue
    const deleted = await catalogE2eOrphanOrderDelete(ctx, order, runId.data)
    if (!deleted.success) continue
    orphanOrdersDeleted += 1
    orphanTicketsDeleted += deleted.data
  }
  if (orphanOrdersDeleted > 0)
    console.info("E2E orphaned order page swept", {
      scannedOrders: batch.page.length,
      orphanOrdersDeleted,
      isDone: batch.isDone,
    })
  return createResult({
    scannedOrders: batch.page.length,
    isDone: batch.isDone,
    continueCursor: batch.continueCursor,
    orphanOrdersDeleted,
    orphanTicketsDeleted,
  })
}

async function catalogE2eOrphanOrderDelete(
  ctx: MutationCtx,
  order: Doc<"ticketOrders">,
  runId: string,
): PromiseResult<number> {
  const op = "catalogE2eOrphanOrderDelete"
  const expectedParticipant = `E2E Participant ${runId}`
  const lines = await ctx.db
    .query("ticketOrderLines")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (
    lines.length !== 1 ||
    lines[0]?.eventKey !== order.eventKey ||
    lines[0]?.quantity !== 1 ||
    lines[0]?.participantNamesJson !== JSON.stringify([expectedParticipant])
  )
    return createResultError(op, "Orphan order lines do not prove the exact run")
  const attempts = await ctx.db
    .query("ticketPaymentAttempts")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (attempts.length > 100 || attempts.some((payment) => payment.stripeMode !== "test"))
    return createResultError(op, "Non-test or unbounded payment attempts; no cleanup performed")
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (
    tickets.length > 100 ||
    tickets.some(
      (ticket) =>
        ticket.eventKey !== order.eventKey ||
        ticket.eventTitle !== order.eventTitle ||
        ticket.participantName !== expectedParticipant,
    )
  )
    return createResultError(op, "Orphan issued tickets do not match the exact run")
  if (order.status === "paid" && tickets.length !== 1)
    return createResultError(op, "Paid orphan order has no single proven issued ticket")
  const deliveries = await ctx.db
    .query("ticketOrderDeliveries")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  const fulfillment = await ctx.db
    .query("ticketFulfillmentWork")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  const reservations = await ctx.db
    .query("ticketReservations")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (deliveries.length > 100 || fulfillment.length > 100 || reservations.length > 100)
    return createResultError(op, "Fixture exceeds bounded verification limit")
  const history: Doc<"ticketCheckInHistory">[] = []
  for (const ticket of tickets)
    history.push(
      ...(await ctx.db
        .query("ticketCheckInHistory")
        .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
        .take(childTake)),
    )
  if (history.length > 500) return createResultError(op, "Fixture exceeds bounded verification limit")
  for (const row of history) await ctx.db.delete("ticketCheckInHistory", row._id)
  for (const row of tickets) await ctx.db.delete("ticketIssued", row._id)
  for (const row of deliveries) await ctx.db.delete("ticketOrderDeliveries", row._id)
  for (const row of fulfillment) await ctx.db.delete("ticketFulfillmentWork", row._id)
  for (const row of attempts) await ctx.db.delete("ticketPaymentAttempts", row._id)
  for (const row of lines) await ctx.db.delete("ticketOrderLines", row._id)
  for (const row of reservations) await ctx.db.delete("ticketReservations", row._id)
  await ctx.db.delete("ticketOrders", order._id)
  if (await ctx.db.get("ticketOrders", order._id))
    return createResultError(op, "Orphan order cleanup verification failed")
  return createResult(tickets.length)
}

/**
 * Delete one proven technical-checkout orphan order with its full child graph.
 * The tiers are already gone with the event, so lines prove linkage through
 * the exact fixture event key (never a generic test title) with a positive
 * quantity; tickets prove it through the same exact key. Test and live Stripe
 * modes are both accepted solely for this exact key; Stripe financial history
 * is never refunded or deleted.
 */
async function catalogE2eTechnicalCheckoutOrphanOrderDelete(
  ctx: MutationCtx,
  order: Doc<"ticketOrders">,
): PromiseResult<number> {
  const op = "catalogE2eTechnicalCheckoutOrphanOrderDelete"
  const lines = await ctx.db
    .query("ticketOrderLines")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (
    lines.length === 0 ||
    lines.length > 10 ||
    lines.some((line) => line.eventKey !== order.eventKey || line.quantity < 1)
  )
    return createResultError(op, "Orphan order lines do not prove the fixture event")
  const attempts = await ctx.db
    .query("ticketPaymentAttempts")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (attempts.length > 100) return createResultError(op, "Fixture exceeds bounded verification limit")
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (tickets.length > 100 || tickets.some((ticket) => ticket.eventKey !== order.eventKey))
    return createResultError(op, "Orphan issued tickets do not match the fixture event")
  if (order.status === "paid" && tickets.length === 0)
    return createResultError(op, "Paid orphan order has no proven issued ticket")
  const deliveries = await ctx.db
    .query("ticketOrderDeliveries")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  const fulfillment = await ctx.db
    .query("ticketFulfillmentWork")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  const reservations = await ctx.db
    .query("ticketReservations")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .take(childTake)
  if (deliveries.length > 100 || fulfillment.length > 100 || reservations.length > 100)
    return createResultError(op, "Fixture exceeds bounded verification limit")
  const history: Doc<"ticketCheckInHistory">[] = []
  for (const ticket of tickets)
    history.push(
      ...(await ctx.db
        .query("ticketCheckInHistory")
        .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
        .take(childTake)),
    )
  if (history.length > 500) return createResultError(op, "Fixture exceeds bounded verification limit")
  for (const row of history) await ctx.db.delete("ticketCheckInHistory", row._id)
  for (const row of tickets) await ctx.db.delete("ticketIssued", row._id)
  for (const row of deliveries) await ctx.db.delete("ticketOrderDeliveries", row._id)
  for (const row of fulfillment) await ctx.db.delete("ticketFulfillmentWork", row._id)
  for (const row of attempts) await ctx.db.delete("ticketPaymentAttempts", row._id)
  for (const row of lines) await ctx.db.delete("ticketOrderLines", row._id)
  for (const row of reservations) await ctx.db.delete("ticketReservations", row._id)
  await ctx.db.delete("ticketOrders", order._id)
  if (await ctx.db.get("ticketOrders", order._id))
    return createResultError(op, "Orphan order cleanup verification failed")
  return createResult(tickets.length)
}
