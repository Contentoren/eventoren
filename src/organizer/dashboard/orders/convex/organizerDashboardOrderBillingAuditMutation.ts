import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { organizerDashboardOrderAuditWrite } from "./organizerDashboardOrderAuditWrite.ts"

/**
 * Internal audit writer for the organizer billing actions. Every successful
 * refund, invoice, and resend call records one audit row with the acting
 * user, the order scope, and the UTC instant. No amounts, references,
 * credentials, or provider evidence enter the audit row.
 */
export const organizerDashboardOrderBillingAuditMutation = internalMutation({
  args: {
    orgId: v.id("orgs"),
    orderId: v.id("ticketOrders"),
    eventKey: v.string(),
    actorUserId: v.id("users"),
    at: v.string(),
    action: v.union(
      v.literal("refund_requested"),
      v.literal("refund_status_checked"),
      v.literal("invoice_status_checked"),
      v.literal("invoice_resent"),
      v.literal("invoice_pdf_downloaded"),
    ),
  },
  handler: async (ctx, args): PromiseResult<null> => {
    await organizerDashboardOrderAuditWrite(ctx, {
      orgId: args.orgId,
      orderId: args.orderId,
      eventKey: args.eventKey,
      actorUserId: args.actorUserId,
      at: args.at,
      action: args.action,
    })
    return createResult(null)
  },
})
