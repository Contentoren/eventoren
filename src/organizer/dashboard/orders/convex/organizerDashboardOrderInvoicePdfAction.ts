import { v } from "convex/values"
import * as a from "valibot"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardBillingInvoicePdfSchema } from "#src/organizer/dashboard/billing/organizerDashboardBillingOperationSchemas.ts"
import {
  organizerDashboardBillingConfigRead,
  organizerDashboardBillingInvoicePdfGet,
} from "#src/organizer/dashboard/billing/organizerDashboardBillingTransport.ts"

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export const organizerDashboardOrderInvoicePdfAction = action({
  args: { token: v.string(), orgId: v.id("orgs"), orderId: v.id("ticketOrders") },
  handler: async (ctx, args): PromiseResult<{ pdfBase64: string; byteLength: number }> => {
    const op = "organizerDashboardOrderInvoicePdfAction"
    const parsed = a.safeParse(organizerDashboardBillingInvoicePdfSchema, {
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
    const pdf = await organizerDashboardBillingInvoicePdfGet(config.data, {
      paymentReference: access.data.paymentReference,
      orderReference: access.data.orderReference,
      stripeMode: access.data.stripeMode,
    })
    if (!pdf.success) return pdf
    const recorded = await ctx.runMutation(
      internal.organizerDashboardBilling.organizerDashboardOrderBillingAuditMutation,
      {
        orgId: args.orgId,
        orderId: args.orderId,
        eventKey: access.data.eventKey,
        actorUserId: access.data.userId,
        at: new Date().toISOString(),
        action: "invoice_pdf_downloaded",
      },
    )
    if (!recorded.success) return recorded
    return createResult({ pdfBase64: uint8ArrayToBase64(pdf.data), byteLength: pdf.data.byteLength })
  },
})
