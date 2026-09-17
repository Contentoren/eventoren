import { internal } from "#convex/_generated/api.js"
import { internalAction } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { billingEventorenClient } from "./billingEventorenClient.js"

export const ticketPaymentReconcileScheduledAction = internalAction({
  args: {},
  handler: async (ctx): PromiseResult<{ checked: number; fulfilled: number }> => {
    const config = billingEventorenClient.configRead()
    if (!config.success) return config
    const contexts = await ctx.runQuery(internal.ticketing.ticketPaymentReconcileScheduledContextQuery, {
      stripeMode: config.data.stripeMode,
      now: Date.now(),
    })
    if (!contexts.success) return contexts
    let checked = 0
    for (const context of contexts.data) {
      const status = await billingEventorenClient.statusGet(config.data, context.paymentReference)
      if (!status.success || status.data.kind === "not_found") {
        const recorded = await ctx.runMutation(internal.ticketing.ticketPaymentReconcileFailureMutation, {
          orderId: context.orderId,
          paymentReference: context.paymentReference,
          stripeMode: context.stripeMode,
          errorMessage: status.success ? "Billing returned no payment for the checkout" : status.errorMessage,
        })
        if (!recorded.success) return recorded
        continue
      }
      checked += 1
      const payment = status.data.data
      if (payment.payment === "expired") {
        const expired = await ctx.runMutation(internal.ticketing.ticketReservationExpireMutation, {
          orderId: context.orderId,
          paymentReference: payment.paymentReference,
          billingOrderReference: payment.orderReference,
          stripeMode: payment.stripeMode,
          reason: "Billing confirmed that the checkout session expired",
        })
        if (!expired.success) {
          const recorded = await ctx.runMutation(internal.ticketing.ticketPaymentReconcileFailureMutation, {
            orderId: context.orderId,
            paymentReference: context.paymentReference,
            stripeMode: context.stripeMode,
            errorMessage: expired.errorMessage,
          })
          if (!recorded.success) return recorded
        }
        continue
      }
      const applied = await ctx.runMutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
        orderId: context.orderId,
        paymentReference: payment.paymentReference,
        billingOrderReference: payment.orderReference,
        stripeMode: payment.stripeMode,
        payment: payment.payment,
      })
      if (!applied.success) {
        const recorded = await ctx.runMutation(internal.ticketing.ticketPaymentReconcileFailureMutation, {
          orderId: context.orderId,
          paymentReference: context.paymentReference,
          stripeMode: context.stripeMode,
          errorMessage: applied.errorMessage,
        })
        if (!recorded.success) return recorded
      }
    }

    return createResult({ checked, fulfilled: 0 })
  },
})
