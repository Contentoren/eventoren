import type { Doc } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type Result } from "#result"
import type { CatalogE2eOwnedGraph } from "./catalogE2eOwnedGraphProve.js"
import { catalogE2eOwnedScannerLinkCollect } from "./catalogE2eOwnedScannerLinkCollect.js"

const maxTiers = 10
const maxRows = 100
const maxHistory = 500
const maxLinesPerOrder = 10

/**
 * Prove a fully test-only fixture graph for a test-like event that failed
 * exact ownership (drifted title/organizer from a previous run, or generic
 * test-like text without an exact run marker).
 *
 * No name or marker-tuple agreement is required. Instead every order under
 * the event must be test-mode Stripe, every payment attempt test-mode, and
 * every issued ticket must belong to an event order; live revenue, foreign
 * tickets, active foreign reservations, or unbounded graphs refuse the whole
 * event for manual reconciliation. Used only by the post-success full
 * cleanup (staleAfterMs 0); routine sweeps stay on exact ownership.
 */
export async function catalogE2eTestLikeGraphProve(
  ctx: MutationCtx,
  input: {
    event: Doc<"catalogEvents">
    runId: string
  },
): Promise<Result<CatalogE2eOwnedGraph>> {
  const op = "catalogE2eTestLikeGraphProve"
  const event = input.event

  const tiers = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
    .take(maxTiers + 1)
  if (tiers.length > maxTiers) return createResultError(op, "Test-like fixture exceeds tier bound; reconcile manually")
  const tier = tiers[0] ?? null

  const orders = await ctx.db
    .query("ticketOrders")
    .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", event.eventKey))
    .take(maxRows + 1)
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
    .take(maxRows + 1)
  if (orders.length > maxRows || tickets.length > maxRows)
    return createResultError(op, "Test-like fixture exceeds bounded verification limit")
  if (tier && tier.sold > 0 && orders.length === 0)
    return createResultError(op, "Sold tier has no test order; retain for reconciliation")

  for (const order of orders) {
    if (order.stripeMode !== "test") return createResultError(op, "Live Stripe order detected; no cleanup performed")
    if (order.status === "paid_inventory_conflict")
      return createResultError(op, "Conflicted order requires manual reconciliation")
  }

  const orderIds = new Set(orders.map((order) => order._id))
  for (const ticket of tickets) {
    if (!orderIds.has(ticket.orderId)) return createResultError(op, "Unmatched issued ticket; reconcile manually")
  }
  for (const order of orders) {
    const orderTickets = tickets.filter((ticket) => ticket.orderId === order._id)
    if (order.status === "paid" && orderTickets.length !== 1)
      return createResultError(op, "Paid order has no single proven issued ticket; retain for reconciliation")
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
      .take(maxLinesPerOrder + 1)
    if (
      orderLines.length === 0 ||
      orderLines.length > maxLinesPerOrder ||
      orderLines.some((line) => line.eventKey !== order.eventKey || line.quantity < 1)
    )
      return createResultError(op, "Order lines do not prove the test-like fixture event")
    lines.push(...orderLines)
    const orderAttempts = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(maxRows + 1)
    if (orderAttempts.length > maxRows || orderAttempts.some((payment) => payment.stripeMode !== "test"))
      return createResultError(op, "Non-test or unbounded payment attempts; no cleanup performed")
    attempts.push(...orderAttempts)
    deliveries.push(
      ...(await ctx.db
        .query("ticketOrderDeliveries")
        .withIndex("orderId", (q) => q.eq("orderId", order._id))
        .take(maxRows + 1)),
    )
    if (deliveries.length > maxRows) return createResultError(op, "Fixture exceeds bounded verification limit")
    fulfillment.push(
      ...(await ctx.db
        .query("ticketFulfillmentWork")
        .withIndex("orderId", (q) => q.eq("orderId", order._id))
        .take(maxRows + 1)),
    )
    if (fulfillment.length > maxRows) return createResultError(op, "Fixture exceeds bounded verification limit")
    reservations.push(
      ...(await ctx.db
        .query("ticketReservations")
        .withIndex("orderId", (q) => q.eq("orderId", order._id))
        .take(maxRows + 1)),
    )
    if (reservations.length > maxRows) return createResultError(op, "Fixture exceeds bounded verification limit")
  }

  if (tier) {
    const activeReservations = await ctx.db
      .query("ticketReservations")
      .withIndex("tierIdAndStatus", (q) => q.eq("tierId", tier._id).eq("status", "active"))
      .take(maxRows + 1)
    if (activeReservations.length > maxRows) return createResultError(op, "Fixture exceeds bounded verification limit")
    if (activeReservations.some((reservation) => !orderIds.has(reservation.orderId)))
      return createResultError(op, "Active reservations prevent test-like cleanup")
    for (const reservation of activeReservations)
      if (!reservations.some((known) => known._id === reservation._id)) reservations.push(reservation)
  }

  const history: Doc<"ticketCheckInHistory">[] = []
  for (const ticket of tickets) {
    history.push(
      ...(await ctx.db
        .query("ticketCheckInHistory")
        .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ticket._id))
        .take(maxRows + 1)),
    )
    if (history.length > maxHistory) return createResultError(op, "Fixture exceeds bounded verification limit")
  }

  const links = await catalogE2eOwnedScannerLinkCollect(ctx, event.eventKey)
  if (!links.success) return links

  return createResult({
    event,
    runId: input.runId,
    tier,
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
