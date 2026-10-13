import type { Doc } from "#convex/_generated/dataModel.js"

/** Ticket delivery does not grant eligibility for paid financial work. */
export function ticketFulfillmentWorkEligible(order: Doc<"ticketOrders">, deliveryMode: "tickets_only" | "paid") {
  if (order.cancellation !== undefined) return false
  if (deliveryMode === "paid")
    return order.status === "paid" && order.paymentStatus === "paid" && order.fulfillmentEligible === true
  return (
    (order.status === "reserved" || order.status === "checkout_created") &&
    order.paymentStatus === "pending" &&
    order.ticketsIssuedAt !== undefined &&
    typeof order.checkoutCompletedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T/u.test(order.checkoutCompletedAt) &&
    Number.isFinite(Date.parse(order.checkoutCompletedAt)) &&
    order.paymentMethodType === "sepa_debit" &&
    order.stripePaymentIntentStatus === "processing"
  )
}
