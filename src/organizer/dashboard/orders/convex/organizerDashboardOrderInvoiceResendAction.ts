import { v } from "convex/values"
import * as a from "valibot"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardBillingInvoiceResendSchema } from "#src/organizer/dashboard/billing/organizerDashboardBillingOperationSchemas.ts"
import {
  organizerDashboardBillingConfigRead,
  organizerDashboardBillingInvoiceResend,
} from "#src/organizer/dashboard/billing/organizerDashboardBillingTransport.ts"
import { organizerDashboardInvoiceDeliveryFromEmailStatus } from "#src/organizer/dashboard/billing/organizerDashboardBillingSchemas.ts"

export const organizerDashboardOrderInvoiceResendAction = action({
  args: { token: v.string(), orgId: v.id("orgs"), orderId: v.id("ticketOrders"), idempotencyKey: v.string() },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    delivery: "pending" | "sent" | "failed"
    emailStatus: "pending" | "sending" | "sent" | "failed" | "unknown" | "skipped" | null
    emailSentAt: string | null
    invoiceNumber: string | null
    pdfAvailable: boolean
  }> => {
    const op = "organizerDashboardOrderInvoiceResendAction"
    const parsed = a.safeParse(organizerDashboardBillingInvoiceResendSchema, {
      orgId: args.orgId,
      orderId: args.orderId,
      idempotencyKey: args.idempotencyKey,
    })
    if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
    const access = await ctx.runQuery(internal.organizerDashboardBilling.organizerDashboardOrderBillingAccessQuery, {
      token: args.token,
      orgId: args.orgId,
      orderId: args.orderId,
      permission: "bestellungen.verwalten",
    })
    if (!access.success) return access
    const config = organizerDashboardBillingConfigRead()
    if (!config.success) return config
    const resend = await organizerDashboardBillingInvoiceResend(config.data, {
      paymentReference: access.data.paymentReference,
      orderReference: access.data.orderReference,
      stripeMode: access.data.stripeMode,
      idempotencyKey: parsed.output.idempotencyKey,
    })
    if (!resend.success) return resend
    const recorded = await ctx.runMutation(
      internal.organizerDashboardBilling.organizerDashboardOrderBillingAuditMutation,
      {
        orgId: args.orgId,
        orderId: args.orderId,
        eventKey: access.data.eventKey,
        actorUserId: access.data.userId,
        at: new Date().toISOString(),
        action: "invoice_resent",
      },
    )
    if (!recorded.success) return recorded
    return createResult({
      delivery: organizerDashboardInvoiceDeliveryFromEmailStatus(resend.data.emailStatus),
      emailStatus: resend.data.emailStatus,
      emailSentAt: resend.data.emailSentAt,
      invoiceNumber: resend.data.invoiceNumber,
      pdfAvailable: resend.data.pdfAvailable,
    })
  },
})
