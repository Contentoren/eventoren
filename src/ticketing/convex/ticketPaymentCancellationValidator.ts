import { v } from "convex/values"

const correlation = {
  cancelledAt: v.string(),
  organizationId: v.string(),
  eventKey: v.string(),
  orderReference: v.string(),
  paymentReference: v.string(),
  stripeMode: v.union(v.literal("live"), v.literal("test")),
  paymentMethodType: v.literal("sepa_debit"),
  stripeEventId: v.string(),
  stripeSessionId: v.string(),
  stripePaymentIntentId: v.string(),
}

export const ticketPaymentCancellationValidator = v.union(
  v.object({
    ...correlation,
    reason: v.literal("payment_failed"),
    stripeEventType: v.literal("checkout.session.async_payment_failed"),
    stripeChargeId: v.union(v.string(), v.null()),
    stripeDisputeId: v.null(),
  }),
  v.object({
    ...correlation,
    reason: v.literal("sepa_disputed"),
    stripeEventType: v.literal("charge.dispute.created"),
    stripeChargeId: v.string(),
    stripeDisputeId: v.string(),
  }),
)
