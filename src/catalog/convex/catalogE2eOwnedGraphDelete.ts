import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"
import type { CatalogE2eOwnedGraph } from "./catalogE2eOwnedGraphProve.js"

export type CatalogE2eOwnedGraphDeletion = {
  deletedOrders: number
  deletedTickets: number
  deletedCheckInHistory: number
  deletedScannerLinks: number
  prunedScannerLinks: number
  paidHistory: "deleted" | "none"
  deletedSnapshotVersions: number
  deletedSnapshotChunks: number
  rebuiltActiveSnapshot: boolean
  snapshotCleanup: "deferred-to-paged-snapshot-collector"
}

/**
 * Hard-delete a proven owned E2E fixture graph: check-in history, issued tickets,
 * deliveries, fulfillment work, payment attempts, lines, reservations, orders,
 * products and event, plus scanner links that exclusively reference the fixture
 * (mixed links keep their foreign keys and drop only the fixture key). Derived
 * catalog sync snapshots/chunks are never touched here: the standalone paged
 * snapshot discovery/cleanup APIs are the sole authoritative global collector
 * (the old eager bounded sweep truncated beyond 1,000 genuine versions and
 * refused graph deletion). The version is still advanced with a building
 * snapshot scheduled, so the next build regenerates the genuine export
 * naturally once the paged collector drains fixture payload. Ticket
 * PDFs live outside Convex (mail attachments and the external billing
 * fulfillment provider); their DB references die with these rows while
 * Stripe/IMAP/PDF reconciliation stays with the existing provider helpers.
 * Stripe financial history (charges, invoices, payment intents) is never
 * refunded or deleted: only Convex fixture rows go here plus deferred cache.
 * Verifies absence afterwards across the event, every tier, every order child
 * (lines, reservations, attempts, deliveries, fulfillment), every ticket
 * check-in row, and every scanner-link reference so a cleanup failure remains
 * a retryable failure.
 */
export async function catalogE2eOwnedGraphDelete(
  ctx: MutationCtx,
  userId: IdUser,
  graph: CatalogE2eOwnedGraph,
): PromiseResult<CatalogE2eOwnedGraphDeletion> {
  const op = "catalogE2eOwnedGraphDelete"
  const paidHistory = graph.orders.some((order) => order.status === "paid" || order.paymentStatus === "paid")
  const now = new Date().toISOString()
  const version = await catalogSyncAdvanceFn(ctx, userId, now)
  if (!version.success) return version
  for (const row of graph.history) await ctx.db.delete("ticketCheckInHistory", row._id)
  for (const row of graph.tickets) await ctx.db.delete("ticketIssued", row._id)
  for (const row of graph.deliveries) await ctx.db.delete("ticketOrderDeliveries", row._id)
  for (const row of graph.fulfillment) await ctx.db.delete("ticketFulfillmentWork", row._id)
  for (const row of graph.attempts) await ctx.db.delete("ticketPaymentAttempts", row._id)
  for (const row of graph.lines) await ctx.db.delete("ticketOrderLines", row._id)
  for (const row of graph.reservations) await ctx.db.delete("ticketReservations", row._id)
  for (const row of graph.orders) await ctx.db.delete("ticketOrders", row._id)
  for (const row of graph.tiers) await ctx.db.delete("catalogTicketTiers", row._id)
  if (graph.tier && !graph.tiers.some((known) => known._id === graph.tier?._id))
    await ctx.db.delete("catalogTicketTiers", graph.tier._id)
  for (const row of graph.scannerLinks) await ctx.db.delete("scannerLinks", row._id)
  for (const prune of graph.scannerLinkPrunes)
    await ctx.db.patch("scannerLinks", prune._id, { eventKeys: prune.eventKeys })
  await ctx.db.delete("catalogEvents", graph.event._id)

  const verifiedEvent = await ctx.db.get("catalogEvents", graph.event._id)
  const verifiedTier = graph.tier ? await ctx.db.get("catalogTicketTiers", graph.tier._id) : null
  const verifiedOrders = await ctx.db
    .query("ticketOrders")
    .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", graph.event.eventKey))
    .take(2)
  const verifiedTickets = await ctx.db
    .query("ticketIssued")
    .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", graph.event.eventKey))
    .take(2)
  const verifiedTiers = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", graph.event._id))
    .take(2)
  for (const order of graph.orders) {
    const residual = await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(1)
    if (residual.length > 0) return createResultError(op, "Catalog cleanup verification failed")
    const residualReservations = await ctx.db
      .query("ticketReservations")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(1)
    if (residualReservations.length > 0) return createResultError(op, "Catalog cleanup verification failed")
    const residualAttempts = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(1)
    if (residualAttempts.length > 0) return createResultError(op, "Catalog cleanup verification failed")
    const residualDeliveries = await ctx.db
      .query("ticketOrderDeliveries")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(1)
    if (residualDeliveries.length > 0) return createResultError(op, "Catalog cleanup verification failed")
    const residualFulfillment = await ctx.db
      .query("ticketFulfillmentWork")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(1)
    if (residualFulfillment.length > 0) return createResultError(op, "Catalog cleanup verification failed")
  }
  for (const ticket of graph.tickets) {
    const residualHistory = await ctx.db
      .query("ticketCheckInHistory")
      .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
      .take(1)
    if (residualHistory.length > 0) return createResultError(op, "Catalog cleanup verification failed")
  }
  const verifiedLinks = await ctx.db.query("scannerLinks").take(101)
  if (verifiedLinks.length >= 101)
    return createResultError(op, "Scanner link verification unbounded; reconcile manually")
  for (const tier of graph.tiers) {
    if (tier._id === graph.tier?._id) continue
    if (await ctx.db.get("catalogTicketTiers", tier._id))
      return createResultError(op, "Catalog cleanup verification failed")
  }
  if (
    verifiedEvent ||
    verifiedTier ||
    verifiedOrders.length > 0 ||
    verifiedTickets.length > 0 ||
    verifiedTiers.length > 0 ||
    verifiedLinks.some((link) => link.eventKeys.includes(graph.event.eventKey))
  )
    return createResultError(op, "Catalog cleanup verification failed")
  console.info("E2E fixture graph deleted; snapshots defer to the paged collector", {
    eventKey: graph.event.eventKey,
    deletedOrders: graph.orders.length,
    deletedTickets: graph.tickets.length,
    deletedCheckInHistory: graph.history.length,
    deletedScannerLinks: graph.scannerLinks.length,
    prunedScannerLinks: graph.scannerLinkPrunes.length,
    paidHistory: paidHistory ? "deleted" : "none",
    snapshotCleanup: "deferred-to-paged-snapshot-collector",
    externalArtifacts: "stripe-imap-pdf-reconciled-separately",
  })
  return createResult({
    deletedOrders: graph.orders.length,
    deletedTickets: graph.tickets.length,
    deletedCheckInHistory: graph.history.length,
    deletedScannerLinks: graph.scannerLinks.length,
    prunedScannerLinks: graph.scannerLinkPrunes.length,
    paidHistory: paidHistory ? ("deleted" as const) : ("none" as const),
    deletedSnapshotVersions: 0,
    deletedSnapshotChunks: 0,
    rebuiltActiveSnapshot: false,
    snapshotCleanup: "deferred-to-paged-snapshot-collector" as const,
  })
}
