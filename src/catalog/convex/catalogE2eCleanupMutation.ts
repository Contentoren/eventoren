import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogE2eCleanupEligibilityCheck } from "./catalogE2eCleanupEligibilityCheck.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

const argsValidator = v.object({
  token: v.string(),
  runId: v.string(),
  eventKey: v.string(),
  eventTitle: v.string(),
  organizer: v.string(),
  eventId: v.optional(v.string()),
  productId: v.optional(v.string()),
  runCreatedAt: v.number(),
  successfulOwnedCurrentRun: v.boolean(),
})

/** Authenticated catalog-only cleanup. Orders, issued tickets and provider records are retained. */
export const catalogE2eCleanupMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogE2eCleanupAuthorized),
})

async function catalogE2eCleanupAuthorized(
  ctx: MutationCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<{
  eventKey: string
  eventArchived: boolean
  product: "absent" | "deleted" | "archived"
  retainedOrders: number
  retainedTickets: number
}> {
  const op = "catalogE2eCleanupMutation"
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!event) return createResultError(op, "Exact run event not found; no cleanup performed")
  if (args.eventId !== undefined && args.eventId !== args.eventKey && args.eventId !== event._id)
    return createResultError(op, "Event identity does not match the checkpoint")
  const eligible = catalogE2eCleanupEligibilityCheck({
    runId: args.runId,
    eventKey: event.eventKey,
    title: event.title,
    organizer: event.organizer,
    createdAt: event._creationTime,
    now: Date.now(),
    runCreatedAt: args.runCreatedAt,
    successfulOwnedCurrentRun: args.successfulOwnedCurrentRun,
  })
  if (!eligible.success || args.eventTitle !== event.title || args.organizer !== event.organizer)
    return createResultError(op, "Event is not an eligible exact run/organizer fixture")

  // A fixture must have at most one product. Never touch a second, unrecognized product.
  const tiers = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventId", (q) => q.eq("eventId", event._id))
    .take(2)
  if (tiers.length > 1) return createResultError(op, "Multiple products require manual reconciliation")
  const tier = tiers[0]
  if (tier && (!args.productId || tier.tierKey !== args.productId || tier.name !== `Paid ticket ${args.runId}`))
    return createResultError(op, "Product identity does not match the exact run")
  if (!tier && args.productId && !event.deletedAt)
    return createResultError(op, "Recorded product not found; reconcile manually")
  if (
    tier &&
    (tier.reserved > 0 ||
      (await ctx.db
        .query("ticketReservations")
        .withIndex("tierIdAndStatus", (q) => q.eq("tierId", tier._id).eq("status", "active"))
        .first()))
  )
    return createResultError(op, "Active reservations prevent product cleanup")

  const orders = await ctx.db
    .query("ticketOrders")
    .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", event.eventKey))
    .take(101)
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("eventKey", (q) => q.eq("eventKey", event.eventKey))
    .take(101)
  if (orders.length > 100 || tickets.length > 100)
    return createResultError(op, "Fixture exceeds bounded verification limit")
  if (orders.some((order) => order.stripeMode !== "test"))
    return createResultError(op, "Live Stripe order detected; no cleanup performed")
  for (const order of orders) {
    const attempt = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(101)
    if (attempt.length > 100 || attempt.some((payment) => payment.stripeMode !== "test"))
      return createResultError(op, "Non-test or unbounded payment attempts; no cleanup performed")
  }
  if (tickets.some((ticket) => !orders.some((order) => order._id === ticket.orderId)))
    return createResultError(op, "Unmatched issued ticket; reconcile manually")

  const now = new Date().toISOString()
  if (!event.deletedAt || (tier && !tier.archivedAt && tier.sold === 0)) {
    const version = await catalogSyncAdvanceFn(ctx, args.userId, now)
    if (!version.success) return version
    if (tier && !tier.archivedAt) {
      if (tier.sold > 0)
        await ctx.db.patch("catalogTicketTiers", tier._id, {
          archivedAt: now,
          catalogVersion: version.data,
          updatedAt: now,
        })
      else await ctx.db.delete(tier._id)
    }
    if (!event.deletedAt)
      await ctx.db.patch("catalogEvents", event._id, {
        status: "archived",
        deletedAt: now,
        catalogVersion: version.data,
        eventRevision: (event.eventRevision ?? 1) + 1,
        updatedAt: now,
      })
  }
  const verifiedEvent = await ctx.db.get("catalogEvents", event._id)
  const verifiedTier = tier ? await ctx.db.get("catalogTicketTiers", tier._id) : null
  if (!verifiedEvent?.deletedAt || verifiedEvent.status !== "archived" || (verifiedTier && !verifiedTier.archivedAt))
    return createResultError(op, "Catalog cleanup verification failed")
  console.info("E2E catalog fixture archived; order/ticket history retained", {
    eventKey: event.eventKey,
    retainedOrders: orders.length,
    retainedTickets: tickets.length,
  })
  return createResult({
    eventKey: event.eventKey,
    eventArchived: true,
    product: !tier ? (args.productId ? "deleted" : "absent") : verifiedTier ? "archived" : "deleted",
    retainedOrders: orders.length,
    retainedTickets: tickets.length,
  })
}
