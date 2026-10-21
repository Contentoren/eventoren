import * as v from "valibot"

/**
 * Dashboard-facing operation schemas for the organizer billing surface.
 * These are thin credential-free wrappers: callers send only the order
 * scope plus the idempotency identities (refund reference, idempotency
 * key) and the refund specifics. Payment, order, and Stripe-mode
 * references are resolved from the persisted order row inside Convex and
 * never accepted from interface input. Field constraints mirror the
 * billing contracts (billing commit a6959c7) so shared rules hold on every
 * surface: HTTP, CLI, and the TS client.
 */

const orgId = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))
const orderId = v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty"))
const refundReference = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Cannot be empty"),
  v.maxLength(200, "Too long"),
  v.regex(/^[A-Za-z0-9_-]+$/, "Invalid refund reference"),
)
const idempotencyKey = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Cannot be empty"),
  v.maxLength(255, "Too long"),
  v.regex(/^[A-Za-z0-9_-]+$/, "Invalid idempotency key"),
)

export const organizerDashboardBillingRefundRequestSchema = v.strictObject({
  orgId,
  orderId,
  refundReference,
  idempotencyKey,
  amountCents: v.pipe(v.number(), v.safeInteger(), v.minValue(1, "Must be positive")),
  reason: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty"), v.maxLength(500, "Too long")),
})

export const organizerDashboardBillingRefundStatusSchema = v.strictObject({
  orgId,
  orderId,
  refundReference,
})

export const organizerDashboardBillingInvoiceStatusSchema = v.strictObject({ orgId, orderId })

export const organizerDashboardBillingInvoicePdfSchema = v.strictObject({ orgId, orderId })

export const organizerDashboardBillingInvoiceResendSchema = v.strictObject({
  orgId,
  orderId,
  idempotencyKey,
})
