import * as v from "valibot"

/**
 * Dashboard-side mirrors of the billing service contracts added in billing
 * commit a6959c7 ("feat(billing): eventoren organizer invoice, refund and
 * resend surface"). The billing service owns validation; these mirrors only
 * validate the transport boundary so a drifted or truncated response can
 * never be presented as genuine billing evidence.
 *
 * Field shapes (regexes, picklists, literals) are copied exactly from
 * `src/billing-client/contracts/eventorenTicket*.ts` in that commit. The
 * dashboard never invents provider identities, paths, or payloads: the only
 * additions are the honest derived states (`coverage`, `readiness`,
 * `delivery`) computed from the billing projection itself.
 */

const billingOrganizationIdSchema = v.pipe(v.string(), v.regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/))
const paymentReferenceSchema = v.pipe(v.string(), v.regex(/^payment_[A-Za-z0-9]+$/))
const orderReferenceSchema = v.pipe(v.string(), v.regex(/^order_[A-Za-z0-9]+$/))
const stripeModeSchema = v.picklist(["live", "test"])
const refundReferenceSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(200), v.regex(/^[A-Za-z0-9_-]+$/))
const idempotencyKeySchema = v.pipe(v.string(), v.minLength(1), v.maxLength(255), v.regex(/^[A-Za-z0-9_-]+$/))

export const organizerDashboardBillingRefundRequestSchema = v.strictObject({
  organizationId: v.optional(billingOrganizationIdSchema),
  paymentReference: paymentReferenceSchema,
  orderReference: orderReferenceSchema,
  stripeMode: stripeModeSchema,
  refundReference: refundReferenceSchema,
  idempotencyKey: idempotencyKeySchema,
  currency: v.literal("EUR"),
  amountCents: v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
  reason: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500)),
})

export const organizerDashboardBillingRefundStatusSchema = v.strictObject({
  success: v.literal(true),
  data: v.strictObject({
    paymentReference: paymentReferenceSchema,
    orderReference: v.pipe(v.string(), v.minLength(1)),
    stripeMode: stripeModeSchema,
    refundReference: v.pipe(v.string(), v.minLength(1)),
    amountCents: v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
    currency: v.literal("EUR"),
    status: v.picklist(["pending", "succeeded", "refunded", "failed"]),
    creditNoteStatus: v.literal("awaiting_accounting"),
    refundedAmountCents: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    remainingAmountCents: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    createdAt: v.pipe(v.string(), v.minLength(1)),
    updatedAt: v.pipe(v.string(), v.minLength(1)),
  }),
})

export const organizerDashboardBillingInvoiceRequestSchema = v.strictObject({
  paymentReference: paymentReferenceSchema,
  orderReference: orderReferenceSchema,
  stripeMode: stripeModeSchema,
})

export const organizerDashboardBillingInvoiceProjectionSchema = v.strictObject({
  paymentReference: paymentReferenceSchema,
  orderReference: v.pipe(v.string(), v.minLength(1)),
  stripeMode: stripeModeSchema,
  invoiceStatus: v.picklist([
    "pending",
    "processing",
    "invoice_created",
    "pdf_downloaded",
    "failed",
    "manual_reconciliation_required",
  ]),
  invoiceNumber: v.nullable(v.pipe(v.string(), v.minLength(1))),
  pdfAvailable: v.boolean(),
  emailStatus: v.nullable(v.picklist(["pending", "sending", "sent", "failed", "unknown", "skipped"])),
  emailSentAt: v.nullable(v.pipe(v.string(), v.minLength(1))),
  updatedAt: v.nullable(v.pipe(v.string(), v.minLength(1))),
})

export const organizerDashboardBillingInvoiceStatusResponseSchema = v.strictObject({
  success: v.literal(true),
  data: organizerDashboardBillingInvoiceProjectionSchema,
})

export const organizerDashboardBillingInvoiceResendRequestSchema = v.strictObject({
  organizationId: v.optional(billingOrganizationIdSchema),
  paymentReference: paymentReferenceSchema,
  orderReference: orderReferenceSchema,
  stripeMode: stripeModeSchema,
  idempotencyKey: idempotencyKeySchema,
})

export const organizerDashboardBillingInvoiceResendResponseSchema = v.strictObject({
  success: v.literal(true),
  data: organizerDashboardBillingInvoiceProjectionSchema,
})

/** Honest dashboard state derived from the billing refund projection only. */
export const organizerDashboardRefundCoverageSchema = v.picklist(["pending", "partial", "full", "failed"])

export function organizerDashboardRefundCoverageFromStatus(
  status: "pending" | "succeeded" | "refunded" | "failed",
): v.InferOutput<typeof organizerDashboardRefundCoverageSchema> {
  switch (status) {
    case "pending":
      return "pending"
    case "succeeded":
      return "partial"
    case "refunded":
      return "full"
    case "failed":
      return "failed"
  }
}

/** Honest dashboard state: ready only when the billing service reports a PDF. */
export const organizerDashboardInvoiceReadinessSchema = v.picklist(["pending", "ready"])

export function organizerDashboardInvoiceReadinessFromProjection(projection: {
  readonly pdfAvailable: boolean
}): v.InferOutput<typeof organizerDashboardInvoiceReadinessSchema> {
  return projection.pdfAvailable ? "ready" : "pending"
}

/** Honest dashboard state derived from the billing email projection only. */
export const organizerDashboardInvoiceDeliverySchema = v.picklist(["pending", "sent", "failed"])

export function organizerDashboardInvoiceDeliveryFromEmailStatus(
  emailStatus: "pending" | "sending" | "sent" | "failed" | "unknown" | "skipped" | null,
): v.InferOutput<typeof organizerDashboardInvoiceDeliverySchema> {
  if (emailStatus === "sent") return "sent"
  if (emailStatus === "failed" || emailStatus === "unknown") return "failed"
  return "pending"
}

export type OrganizerDashboardBillingRefundStatus = v.InferOutput<typeof organizerDashboardBillingRefundStatusSchema>
export type OrganizerDashboardBillingInvoiceStatusResponse = v.InferOutput<
  typeof organizerDashboardBillingInvoiceStatusResponseSchema
>
export type OrganizerDashboardBillingInvoiceResendResponse = v.InferOutput<
  typeof organizerDashboardBillingInvoiceResendResponseSchema
>
