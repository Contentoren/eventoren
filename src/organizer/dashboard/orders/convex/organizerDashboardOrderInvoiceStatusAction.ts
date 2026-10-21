import { v } from "convex/values"
import * as a from "valibot"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardBillingInvoiceStatusSchema } from "#src/organizer/dashboard/billing/organizerDashboardBillingOperationSchemas.ts"
import {
  organizerDashboardBillingConfigRead,
  organizerDashboardBillingInvoiceStatusGet,
} from "#src/organizer/dashboard/billing/organizerDashboardBillingTransport.ts"
import { organizerDashboardInvoiceReadinessFromProjection } from "#src/organizer/dashboard/billing/organizerDashboardBillingSchemas.ts"

export const organizerDashboardOrderInvoiceStatusAction = action({
  args: { token: v.string(), orgId: v.id("orgs"), orderId: v.id("ticketOrders") },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    invoiceStatus:
      | "pending"
      | "processing"
      | "invoice_created"
      | "pdf_downloaded"
      | "failed"
      | "manual_reconciliation_required"
    readiness: "pending" | "ready"
    invoiceNumber: string | null
    pdfAvailable: boolean
    emailStatus: "pending" | "sending" | "sent" | "failed" | "unknown" | "skipped" | null
    emailSentAt: string | null
  }> => {
    const op = "organizerDashboardOrderInvoiceStatusAction"
    const parsed = a.safeParse(organizerDashboardBillingInvoiceStatusSchema, {
      orgId: args.orgId,
      orderId: args.orderId,
    })
    if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
    const access = await ctx.runQuery(internal.organizerDashboardBilling.organizerDashboardOrderBillingAccessQuery, {
      token: args.token,
      orgId: args.orgId,
      orderId: args.orderId,
      permission: "bestellungen.sehen",
    })
    if (!access.success) return access
    const config = organizerDashboardBillingConfigRead()
    if (!config.success) return config
    const invoice = await organizerDashboardBillingInvoiceStatusGet(config.data, {
      paymentReference: access.data.paymentReference,
      orderReference: access.data.orderReference,
      stripeMode: access.data.stripeMode,
    })
    if (!invoice.success) return invoice
    const recorded = await ctx.runMutation(
      internal.organizerDashboardBilling.organizerDashboardOrderBillingAuditMutation,
      {
        orgId: args.orgId,
        orderId: args.orderId,
        eventKey: access.data.eventKey,
        actorUserId: access.data.userId,
        at: new Date().toISOString(),
        action: "invoice_status_checked",
      },
    )
    if (!recorded.success) return recorded
    return createResult({
      invoiceStatus: invoice.data.invoiceStatus,
      readiness: organizerDashboardInvoiceReadinessFromProjection(invoice.data),
      invoiceNumber: invoice.data.invoiceNumber,
      pdfAvailable: invoice.data.pdfAvailable,
      emailStatus: invoice.data.emailStatus,
      emailSentAt: invoice.data.emailSentAt,
    })
  },
})
