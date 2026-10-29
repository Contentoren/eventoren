import type { Doc } from "#convex/_generated/dataModel.js"

/** One contribution per scanned ticket; participant identities never identify buyers. */
export function catalogEventOverviewTicketCreate(ticket: Doc<"ticketIssued">, order: Doc<"ticketOrders">) {
  const ticketId = String(ticket._id)
  if (ticket.cancelled || order.cancellation || order.paymentStatus !== "paid") {
    return { ticketId, soldTicketCount: 0 as const, buyerKey: null }
  }
  const email = order.customerEmail.trim().toLowerCase()
  const buyerKey = email ? `email:${email}` : order.ownerUserId ? `user:${order.ownerUserId}` : `order:${order._id}`
  return { ticketId, soldTicketCount: 1 as const, buyerKey }
}
