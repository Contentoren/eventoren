import { v } from "convex/values"
import * as a from "valibot"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardBillingRefundStatusSchema } from "#src/organizer/dashboard/billing/organizerDashboardBillingOperationSchemas.ts"
import {
  organizerDashboardBillingConfigRead,
  organizerDashboardBillingRefundStatusGet,
} from "#src/organizer/dashboard/billing/organizerDashboardBillingTransport.ts"
import { organizerDashboardRefundCoverageFromStatus } from "#src/organizer/dashboard/billing/organizerDashboardBillingSchemas.ts"

export const organizerDashboardOrderRefundStatusAction = action({
  args: { token: v.string(), orgId: v.id("orgs"), orderId: v.id("ticketOrders"), refundReference: v.string() },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    refundReference: string
    amountCents: number
    currency: "EUR"
    status: "pending" | "succeeded" | "refunded" | "failed"
    coverage: "pending" | "partial" | "full" | "failed"
    creditNoteStatus: "awaiting_accounting"
    refundedAmountCents: number
    remainingAmountCents: number
  }> => {
    const op = "organizerDashboardOrderRefundStatusAction"
    const parsed = a.safeParse(organizerDashboardBillingRefundStatusSchema, {
      orgId: args.orgId,
      orderId: args.orderId,
      refundReference: args.refundReference,
    })
    if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
    const access = await ctx.runQuery(internal.organizerDashboardBilling.organizerDashboardOrderBillingAccessQuery, {
      token: args.token,
      orgId: args.orgId,
      orderId: args.orderId,
      permission: "bestellungen.erstatten",
    })
    if (!access.success) return access
    const config = organizerDashboardBillingConfigRead()
    if (!config.success) return config
    const refund = await organizerDashboardBillingRefundStatusGet(config.data, {
      paymentReference: access.data.paymentReference,
      orderReference: access.data.orderReference,
      stripeMode: access.data.stripeMode,
      refundReference: parsed.output.refundReference,
    })
    if (!refund.success) return refund
    const recorded = await ctx.runMutation(
      internal.organizerDashboardBilling.organizerDashboardOrderBillingAuditMutation,
      {
        orgId: args.orgId,
        orderId: args.orderId,
        eventKey: access.data.eventKey,
        actorUserId: access.data.userId,
        at: new Date().toISOString(),
        action: "refund_status_checked",
      },
    )
    if (!recorded.success) return recorded
    return createResult({
      refundReference: refund.data.refundReference,
      amountCents: refund.data.amountCents,
      currency: refund.data.currency,
      status: refund.data.status,
      coverage: organizerDashboardRefundCoverageFromStatus(refund.data.status),
      creditNoteStatus: refund.data.creditNoteStatus,
      refundedAmountCents: refund.data.refundedAmountCents,
      remainingAmountCents: refund.data.remainingAmountCents,
    })
  },
})
