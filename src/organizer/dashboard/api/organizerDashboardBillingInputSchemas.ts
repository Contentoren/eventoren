import {
  organizerDashboardBillingInvoicePdfSchema,
  organizerDashboardBillingInvoiceResendSchema,
  organizerDashboardBillingInvoiceStatusSchema,
  organizerDashboardBillingRefundRequestSchema,
  organizerDashboardBillingRefundStatusSchema,
} from "../billing/organizerDashboardBillingOperationSchemas.ts"

/**
 * Strict, credential-free transport wrappers for the organizer billing
 * operations. The shared operation schemas are the single source: HTTP,
 * CLI, and the TS client enforce identical rules before any transport, and
 * the Bearer [REDACTED] is never part of the body.
 */
export const organizerDashboardBillingInputSchemas = {
  billingRefundRequest: organizerDashboardBillingRefundRequestSchema,
  billingRefundStatus: organizerDashboardBillingRefundStatusSchema,
  billingInvoiceStatus: organizerDashboardBillingInvoiceStatusSchema,
  billingInvoicePdf: organizerDashboardBillingInvoicePdfSchema,
  billingInvoiceResend: organizerDashboardBillingInvoiceResendSchema,
} as const
