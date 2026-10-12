import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type Result } from "#result"
import { catalogE2eOwnedEventCheck } from "./catalogE2eOwnedEventCheck.js"
import { catalogE2eOwnedOrderCheck } from "./catalogE2eOwnedOrderCheck.js"
import { catalogE2eOwnedScannerLinkCollect } from "./catalogE2eOwnedScannerLinkCollect.js"

export type CatalogE2eOwnedGraph = {
  event: Doc<"catalogEvents">
  runId: string
  tier: Doc<"catalogTicketTiers"> | null
  tiers: Doc<"catalogTicketTiers">[]
  orders: Doc<"ticketOrders">[]
  lines: Doc<"ticketOrderLines">[]
  reservations: Doc<"ticketReservations">[]
  attempts: Doc<"ticketPaymentAttempts">[]
  deliveries: Doc<"ticketOrderDeliveries">[]
  fulfillment: Doc<"ticketFulfillmentWork">[]
  tickets: Doc<"ticketIssued">[]
  history: Doc<"ticketCheckInHistory">[]
  scannerLinks: Doc<"scannerLinks">[]
  scannerLinkPrunes: { _id: Id<"scannerLinks">; eventKeys: string[] }[]
}

export type CatalogE2eCheckpointProof = {
  productId?: string
  orderId?: string
  ticketId?: string
}

/**
 * Verify the complete owned fixture graph of one marker-proven E2E event before
 * deletion. Without checkpoint identities every row must prove ownership from its
 * own markers; with checkpoint identities the supplied IDs must match exactly.
 * Any ambiguous, foreign, live-provider or unbounded row refuses the whole event.
 */
export async function catalogE2eOwnedGraphProve(
  ctx: MutationCtx,
  input: {
    event: Doc<"catalogEvents">
    earliestOrderCreationTime: number
    checkpoint?: CatalogE2eCheckpointProof
  },
): Promise<Result<CatalogE2eOwnedGraph>> {
  const op = "catalogE2eOwnedGraphProve"
  const event = input.event
  const owned = catalogE2eOwnedEventCheck({
    eventKey: event.eventKey,
    title: event.title,
    organizer: event.organizer,
  })
  if (!owned.success) return owned
  const runId = owned.data
  const expectedParticipant = `E2E Participant ${runId}`
  const expectedProduct = `Paid ticket ${runId}`

  // A fixture must have at most one product. Never touch a second, unrecognized product.
  const tiers = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
    .take(3)
  if (tiers.length > 1) return createResultError(op, "Multiple products require manual reconciliation")
  const tier = tiers[0] ?? null
  if (tier && tier.name !== expectedProduct)
    return createResultError(op, "Product is not a proven run fixture; retain for manual reconciliation")
  if (input.checkpoint?.productId && (!tier || tier.tierKey !== input.checkpoint.productId))
    return createResultError(op, "Product identity does not match the exact run")

  const orders = await ctx.db
    .query("ticketOrders")
    .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", event.eventKey))
    .take(101)
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
    .take(101)
  if (orders.length > 100 || tickets.length > 100)
    return createResultError(op, "Fixture exceeds bounded verification limit")
  if (tier && tier.sold > 0 && orders.length === 0)
    return createResultError(op, "Sold tier has no proven run order; retain for reconciliation")
  if (input.checkpoint) {
    // A checkpointed run owns at most one checkout and one issued ticket.
    // Event-key coincidence alone cannot prove ownership of a paid order.
    if (
      orders.length > 1 ||
      tickets.length > 1 ||
      (orders.length > 0 && (!input.checkpoint.orderId || orders[0]?._id !== input.checkpoint.orderId)) ||
      (tickets.length > 0 && (!input.checkpoint.ticketId || tickets[0]?._id !== input.checkpoint.ticketId)) ||
      (input.checkpoint.orderId && orders.length === 0) ||
      (input.checkpoint.ticketId && tickets.length === 0)
    )
      return createResultError(
        op,
        "Order/ticket identities cannot be proven from this run; retain for manual reconciliation",
      )
  }
  for (const order of orders) {
    const check = catalogE2eOwnedOrderCheck({
      eventTitle: event.title,
      organizer: event.organizer,
      customerGivenName: order.customerGivenName,
      customerFamilyName: order.customerFamilyName,
      eventSnapshotTitle: order.eventTitle,
      eventSnapshotOrganizer: order.organizer,
      stripeMode: order.stripeMode,
      status: order.status,
      creationTime: order._creationTime,
      earliestCreationTime: Math.max(input.earliestOrderCreationTime, event._creationTime),
      runId,
    })
    if (!check.success) return check
  }

  const orderIds = new Set(orders.map((order) => order._id))
  for (const ticket of tickets) {
    if (!orderIds.has(ticket.orderId)) return createResultError(op, "Unmatched issued ticket; reconcile manually")
    if (
      ticket.eventTitle !== event.title ||
      ticket.tierKey !== tier?.tierKey ||
      ticket.participantName !== expectedParticipant ||
      ticket._creationTime < event._creationTime
    )
      return createResultError(op, "Issued ticket does not match the exact run")
  }
  for (const order of orders) {
    const orderTickets = tickets.filter((ticket) => ticket.orderId === order._id)
    if (order.status === "paid" && orderTickets.length !== 1)
      return createResultError(
        op,
        "Paid order has no single proven issued ticket; retain for fulfillment reconciliation",
      )
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
      .take(3)
    if (
      orderLines.length !== 1 ||
      !tier ||
      orderLines[0]?.tierId !== tier._id ||
      orderLines[0]?.tierKey !== tier.tierKey ||
      orderLines[0]?.quantity !== 1 ||
      orderLines[0]?.participantNamesJson !== JSON.stringify([expectedParticipant])
    )
      return createResultError(op, "Order lines do not prove the exact run product and participant")
    lines.push(...orderLines)
    const orderAttempts = await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("orderId", (q) => q.eq("orderId", order._id))
      .take(101)
    if (orderAttempts.length > 100 || orderAttempts.some((payment) => payment.stripeMode !== "test"))
      return createResultError(op, "Non-test or unbounded payment attempts; no cleanup performed")
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

  // Active tier reservations must belong to a proven run order; a foreign active
  // reservation blocks product cleanup. A stale reserved counter without rows is harmless:
  // the tier itself is deleted.
  if (tier) {
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
    runId,
    tier,
    tiers: tier ? [tier] : [],
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
