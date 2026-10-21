import { v } from "convex/values"
import * as a from "valibot"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardBillingRefundRequestSchema } from "#src/organizer/dashboard/billing/organizerDashboardBillingOperationSchemas.ts"
import {
  organizerDashboardBillingConfigRead,
  organizerDashboardBillingRefundRequest,
} from "#src/organizer/dashboard/billing/organizerDashboardBillingTransport.ts"
import { organizerDashboardRefundCoverageFromStatus } from "#src/organizer/dashboard/billing/organizerDashboardBillingSchemas.ts"

export const organizerDashboardOrderRefundRequestAction = action({
  args: {
    token: v.string(),
    orgId: v.id("orgs"),
    orderId: v.id("ticketOrders"),
    refundReference: v.string(),
    idempotencyKey: v.string(),
    amountCents: v.number(),
    reason: v.string(),
  },
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
    const op = "organizerDashboardOrderRefundRequestAction"
    const parsed = a.safeParse(organizerDashboardBillingRefundRequestSchema, {
      orgId: args.orgId,
      orderId: args.orderId,
      refundReference: args.refundReference,
      idempotencyKey: args.idempotencyKey,
      amountCents: args.amountCents,
      reason: args.reason,
    })
    if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
    const access = await ctx.runQuery(internal.organizerDashboardBilling.organizerDashboardOrderBillingAccessQuery, {
      token: args.token,
      orgId: args.orgId,
      orderId: args.orderId,
      permission: "bestellungen.erstatten",
    })
    if (!access.success) return access
    const config = organizerDashboardBillingConfigRead()
    if (!config.success) return config
    const refund = await organizerDashboardBillingRefundRequest(config.data, {
      paymentReference: access.data.paymentReference,
      orderReference: access.data.orderReference,
      stripeMode: access.data.stripeMode,
      refundReference: parsed.output.refundReference,
      idempotencyKey: parsed.output.idempotencyKey,
      currency: "EUR",
      amountCents: parsed.output.amountCents,
      reason: parsed.output.reason,
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
        action: "refund_requested",
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
