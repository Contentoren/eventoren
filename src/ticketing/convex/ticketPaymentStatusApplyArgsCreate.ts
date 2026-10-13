import type { EventorenTicketCheckoutStatusResponse } from "billing/contracts/eventorenTicketCheckoutStatusResponseSchema"
import type { Id } from "#convex/_generated/dataModel.js"

// Keep lifecycle evidence from one verified Billing response together. In
// particular, never reconstruct early-issuance eligibility from local history.
export function ticketPaymentStatusApplyArgsCreate(
  orderId: Id<"ticketOrders">,
  payment: EventorenTicketCheckoutStatusResponse["data"] & { payment: "pending" | "paid" | "failed" },
) {
  return {
    orderId,
    paymentReference: payment.paymentReference,
    billingOrderReference: payment.orderReference,
    stripeMode: payment.stripeMode,
    payment: payment.payment,
    bookingNumber: payment.bookingNumber ?? undefined,
    bookingReference: payment.bookingReference ?? undefined,
    ...(payment.checkoutCompletedAt !== undefined ? { checkoutCompletedAt: payment.checkoutCompletedAt } : {}),
    ...(payment.paymentMethodType !== undefined ? { paymentMethodType: payment.paymentMethodType } : {}),
    ...(payment.stripePaymentIntentStatus !== undefined
      ? { stripePaymentIntentStatus: payment.stripePaymentIntentStatus }
      : {}),
    ...(payment.cancellation !== undefined ? { cancellation: payment.cancellation } : {}),
  }
}
