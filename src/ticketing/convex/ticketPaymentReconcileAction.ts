import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { billingEventorenClient } from "./billingEventorenClient.js"
import { ticketOrderAccessResolve } from "./ticketOrderAccessResolve.js"
import { ticketPaymentStatusApplyArgsCreate } from "./ticketPaymentStatusApplyArgsCreate.js"

export const ticketPaymentReconcileAction = action({
  args: {
    orderId: v.id("ticketOrders"),
    token: v.optional(v.string()),
    guestAccessToken: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    orderId: string
    status: "reserved" | "checkout_created" | "paid" | "failed" | "expired" | "released" | "paid_inventory_conflict"
    paymentStatus: "pending" | "paid" | "failed" | "expired"
    ticketCount: number
  }> => {
    const accessResult = await ticketOrderAccessResolve(args)
    if (!accessResult.success) return accessResult
    const paymentContext = await ctx.runQuery(internal.ticketing.ticketOrderPaymentContextQuery, {
      orderId: args.orderId,
      ownerUserId: accessResult.data.userId,
      guestAccessDigest: accessResult.data.guestAccessDigest,
    })
    if (!paymentContext.success) return paymentContext
    const config = billingEventorenClient.configRead()
    if (!config.success) return config
    const statusResult = await billingEventorenClient.statusGet(config.data, paymentContext.data.paymentReference)
    if (!statusResult.success) return statusResult
    if (statusResult.data.kind === "not_found")
      return createResultError("ticketPaymentReconcileAction", "Payment not found")
    const payment = statusResult.data.data
    if (payment.payment === "expired")
      return await ctx.runMutation(internal.ticketing.ticketReservationExpireMutation, {
        orderId: args.orderId,
        paymentReference: payment.paymentReference,
        billingOrderReference: payment.orderReference,
        stripeMode: payment.stripeMode,
        reason: "Billing confirmed that the checkout session expired",
      })
    // Explicit reconciliation also fetches paid orders: a lost SEPA cancellation
    // callback must be recoverable without polling all paid history.
    const applied = await ctx.runMutation(
      internal.ticketing.ticketPaymentStatusApplyMutation,
      ticketPaymentStatusApplyArgsCreate(args.orderId, { ...payment, payment: payment.payment }),
    )
    if (!applied.success) return applied
    return createResult(applied.data)
  },
})
