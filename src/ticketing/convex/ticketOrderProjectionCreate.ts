import type { QueryCtx } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"

export async function ticketOrderProjectionCreate(ctx: QueryCtx, orderId: Id<"ticketOrders">) {
  const order = await ctx.db.get(orderId)
  if (!order) return null
  const lines = await ctx.db
    .query("ticketOrderLines")
    .withIndex("orderId", (q) => q.eq("orderId", orderId))
    .collect()
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", orderId))
    .collect()
  return {
    id: order._id,
    checkoutKey: order.checkoutKey,
    eventKey: order.eventKey,
    eventTitle: order.eventTitle,
    eventSubtitle: order.eventSubtitle,
    eventDescription: order.eventDescription,
    eventStartsAt: order.eventStartsAt,
    eventEndsAt: order.eventEndsAt,
    eventDoorsAt: order.eventDoorsAt,
    venue: order.venue,
    city: order.city,
    address: order.address,
    organizer: order.organizer,
    imageUrl: order.imageUrl,
    imageAlt: order.imageAlt,
    catalogVersion: order.catalogVersion,
    contact: {
      email: order.customerEmail,
      givenName: order.customerGivenName ?? "",
      familyName: order.customerFamilyName ?? "",
      phone: order.customerPhone ?? "",
    },
    subtotalCents: order.subtotalCents,
    feeCents: order.feeCents,
    totalCents: order.totalCents,
    paymentReference: order.paymentReference,
    billingOrderReference: order.billingOrderReference,
    stripeMode: order.stripeMode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    checkoutUrl: order.checkoutUrl,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    lines: lines.map((line) => ({
      tierKey: line.tierKey,
      tierName: line.tierName,
      tierDescription: line.tierDescription,
      quantity: line.quantity,
      priceCents: line.priceCents,
      feeCents: line.feeCents,
    })),
    tickets: tickets.map((ticket) => ({
      id: ticket._id,
      sequence: ticket.sequence,
      code: ticket.code,
      eventKey: ticket.eventKey,
      eventTitle: ticket.eventTitle,
      eventStartsAt: ticket.eventStartsAt,
      eventDoorsAt: ticket.eventDoorsAt,
      venue: ticket.venue,
      city: ticket.city,
      address: ticket.address,
      tierKey: ticket.tierKey,
      tierName: ticket.tierName,
      priceCents: ticket.priceCents,
      feeCents: ticket.feeCents,
      participantName: ticket.participantName,
      issuedAt: ticket.issuedAt,
    })),
  }
}
