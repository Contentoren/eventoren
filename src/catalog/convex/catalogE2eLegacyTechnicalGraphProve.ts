import type { Doc } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type Result } from "#result"
import { catalogE2eLegacyNativeAuthCheck } from "./catalogE2eLegacyNativeAuthCheck.js"
import { catalogE2eLegacyReadinessCheck } from "./catalogE2eLegacyReadinessCheck.js"
import {
  catalogE2eLegacyTechnicalCheckoutCheck,
  catalogE2eLegacyTechnicalCheckoutEventKey,
} from "./catalogE2eLegacyTechnicalCheckoutCheck.js"
import type { CatalogE2eOwnedGraph } from "./catalogE2eOwnedGraphProve.js"
import { catalogE2eOwnedScannerLinkCollect } from "./catalogE2eOwnedScannerLinkCollect.js"

export type CatalogE2eLegacyTechnicalKind = "native-auth" | "readiness" | "technical-checkout"

/**
 * Verify the complete owned graph of one approved legacy technical fixture
 * before deletion. Native-auth drafts (including archived rows) prove ownership
 * through exact key/title marker agreement (current double-marker, historical
 * single-marker, or one exactly-known key-changed row); the readiness draft
 * proves it through the exact key plus technical sync corroboration; the
 * explicitly-fictitious technical-checkout event proves it through the exact
 * key plus fictitious description, with every tier and order line proven linked
 * to that exact event by structure rather than tier wording.
 *
 * Native-auth and readiness fixtures are catalog-only: any retained order
 * refuses the whole event for manual reconciliation. The technical-checkout
 * fixture is the only approved live-provider graph: test and live Stripe modes
 * are both accepted, but solely for its exact event key. Every other
 * live-provider row keeps the existing refusal. All child relations are
 * verified before any deletion; Stripe financial history is never refunded or
 * deleted.
 */
export async function catalogE2eLegacyTechnicalGraphProve(
  ctx: MutationCtx,
  input: { event: Doc<"catalogEvents">; kind: CatalogE2eLegacyTechnicalKind },
): Promise<Result<CatalogE2eOwnedGraph>> {
  const op = "catalogE2eLegacyTechnicalGraphProve"
  const event = input.event

  const tiers = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
    .take(11)
  if (tiers.length > 10) return createResultError(op, "Fixture exceeds bounded verification limit")

  if (input.kind === "native-auth") {
    const owned = catalogE2eLegacyNativeAuthCheck({ eventKey: event.eventKey, title: event.title })
    if (!owned.success) return owned
    if (tiers.length > 1) return createResultError(op, "Multiple products require manual reconciliation")
    const graph = await catalogE2eLegacyCatalogOnlyGraphProve(ctx, event, owned.data.runId, tiers)
    if (!graph.success) return graph
    return graph
  }

  if (input.kind === "readiness") {
    const owned = catalogE2eLegacyReadinessCheck({
      eventKey: event.eventKey,
      description: event.description,
      imageUrl: event.imageUrl,
    })
    if (!owned.success) return owned
    if (tiers.length > 1) return createResultError(op, "Multiple products require manual reconciliation")
    return catalogE2eLegacyCatalogOnlyGraphProve(ctx, event, event.eventKey, tiers)
  }

  const checked = catalogE2eLegacyTechnicalCheckoutCheck({
    eventKey: event.eventKey,
    description: event.description,
  })
  if (!checked.success) return checked
  return catalogE2eLegacyTechnicalCheckoutGraphProve(ctx, event)
}

async function catalogE2eLegacyCatalogOnlyGraphProve(
  ctx: MutationCtx,
  event: Doc<"catalogEvents">,
  runId: string,
  tiers: Doc<"catalogTicketTiers">[],
): Promise<Result<CatalogE2eOwnedGraph>> {
  const op = "catalogE2eLegacyTechnicalGraphProve"
  const orders = await ctx.db
    .query("ticketOrders")
    .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", event.eventKey))
    .take(2)
  if (orders.length > 0)
    return createResultError(op, "Catalog-only fixture retains orders; retain for manual reconciliation")
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
    .take(2)
  if (tickets.length > 0)
    return createResultError(op, "Catalog-only fixture retains tickets; retain for manual reconciliation")
  const links = await catalogE2eOwnedScannerLinkCollect(ctx, event.eventKey)
  if (!links.success) return links
  const tier = tiers[0] ?? null
  return createResult({
    event,
    runId,
    tier,
    tiers,
    orders: [],
    lines: [],
    reservations: [],
    attempts: [],
    deliveries: [],
    fulfillment: [],
    tickets: [],
    history: [],
    scannerLinks: links.data.exclusive,
    scannerLinkPrunes: links.data.prunes,
  })
}

async function catalogE2eLegacyTechnicalCheckoutGraphProve(
  ctx: MutationCtx,
  event: Doc<"catalogEvents">,
): Promise<Result<CatalogE2eOwnedGraph>> {
  const op = "catalogE2eLegacyTechnicalGraphProve"
  if (event.eventKey !== catalogE2eLegacyTechnicalCheckoutEventKey)
    return createResultError(op, "Live-provider cleanup is approved only for the exact technical-checkout fixture")
  const tiers = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
    .take(11)
  if (tiers.length > 10) return createResultError(op, "Fixture exceeds bounded verification limit")
  const tierIds = new Set(tiers.map((tier) => tier._id))

  const orders = await ctx.db
    .query("ticketOrders")
    .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", event.eventKey))
    .take(101)
  if (orders.length > 100) return createResultError(op, "Fixture exceeds bounded verification limit")
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
    .take(101)
  if (tickets.length > 100) return createResultError(op, "Fixture exceeds bounded verification limit")

  for (const order of orders) {
    if (order.eventKey !== event.eventKey)
      return createResultError(op, "Foreign order; retain for manual reconciliation")
    if (order._creationTime < event._creationTime)
      return createResultError(op, "Order predates the fixture event; retain for manual reconciliation")
    if (order.status === "paid_inventory_conflict")
      return createResultError(op, "Conflicted paid order requires manual reconciliation")
    if (order.stripeMode !== "test" && order.stripeMode !== "live")
      return createResultError(op, "Unknown provider mode; retain for manual reconciliation")
  }

  const orderIds = new Set(orders.map((order) => order._id))
  for (const ticket of tickets) {
    if (!orderIds.has(ticket.orderId)) return createResultError(op, "Unmatched issued ticket; reconcile manually")
    if (ticket.eventKey !== event.eventKey || ticket._creationTime < event._creationTime)
      return createResultError(op, "Issued ticket does not match the fixture event")
  }
  for (const order of orders) {
    if (order.status === "paid" && !tickets.some((ticket) => ticket.orderId === order._id))
      return createResultError(op, "Paid order has no proven issued ticket; retain for fulfillment reconciliation")
  }

  const lines: Doc<"ticketOrderLines">[] = []
  const reservations: Doc<"ticketReservations">[] = []
  const attempts: Doc<"ticketPaymentAttempts">[] = []
  const deliveries: Doc<"ticketOrderDeliveries">[] = []
  const fulfillment: Doc<"ticketFulfillmentWork">[] = []
  for (const order of orders) {
    const orderLines = await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(11)
    if (orderLines.length === 0 || orderLines.length > 10)
      return createResultError(op, "Order lines do not prove the fixture product")
    for (const line of orderLines) {
      if (line.eventKey !== event.eventKey || !tierIds.has(line.tierId) || line.quantity < 1)
        return createResultError(op, "Order line does not prove the fixture product")
    }
    lines.push(...orderLines)
    const orderAttempts = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(101)
    if (orderAttempts.length > 100) return createResultError(op, "Fixture exceeds bounded verification limit")
    attempts.push(...orderAttempts)
    deliveries.push(
      ...(await ctx.db
        .query("ticketOrderDeliveries")
        .withIndex("orderId", (q) => q.eq("orderId", order._id))
        .take(101)),
    )
    if (deliveries.length > 100) return createResultError(op, "Fixture exceeds bounded verification limit")
    fulfillment.push(
      ...(await ctx.db
        .query("ticketFulfillmentWork")
        .withIndex("orderId", (q) => q.eq("orderId", order._id))
        .take(101)),
    )
    if (fulfillment.length > 100) return createResultError(op, "Fixture exceeds bounded verification limit")
    reservations.push(
      ...(await ctx.db
        .query("ticketReservations")
        .withIndex("orderId", (q) => q.eq("orderId", order._id))
        .take(101)),
    )
    if (reservations.length > 100) return createResultError(op, "Fixture exceeds bounded verification limit")
  }

  for (const tier of tiers) {
    const activeReservations = await ctx.db
      .query("ticketReservations")
      .withIndex("tierIdAndStatus", (q) => q.eq("tierId", tier._id).eq("status", "active"))
      .take(101)
    if (activeReservations.length > 100) return createResultError(op, "Fixture exceeds bounded verification limit")
    if (activeReservations.some((reservation) => !orderIds.has(reservation.orderId)))
      return createResultError(op, "Active reservations prevent product cleanup")
    for (const reservation of activeReservations)
      if (!reservations.some((known) => known._id === reservation._id)) reservations.push(reservation)
  }

  const history: Doc<"ticketCheckInHistory">[] = []
  for (const ticket of tickets) {
    history.push(
      ...(await ctx.db
        .query("ticketCheckInHistory")
        .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
        .take(101)),
    )
    if (history.length > 500) return createResultError(op, "Fixture exceeds bounded verification limit")
  }

  const links = await catalogE2eOwnedScannerLinkCollect(ctx, event.eventKey)
  if (!links.success) return links

  return createResult({
    event,
    runId: event.eventKey,
    tier: tiers[0] ?? null,
    tiers,
    orders,
    lines,
    reservations,
    attempts,
    deliveries,
    fulfillment,
    tickets,
    history,
    scannerLinks: links.data.exclusive,
    scannerLinkPrunes: links.data.prunes,
  })
}
