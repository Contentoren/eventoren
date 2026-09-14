import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { type ActionCtx, internalAction } from "#convex/_generated/server.js"
import { billingEventorenClient } from "./billingEventorenClient.js"

export const ticketReservationExpireAction = internalAction({
  args: { orderId: v.id("ticketOrders") },
  handler: ticketReservationExpireActionHandler,
})

async function ticketReservationExpireActionHandler(
  ctx: ActionCtx,
  args: { orderId: Id<"ticketOrders"> },
): Promise<unknown> {
  const context = await ctx.runQuery(internal.ticketing.ticketReservationExpirationContextQuery, {
    orderId: args.orderId,
  })
  if (!context.success) return context
  if (
    context.data.status === "paid" ||
    context.data.status === "failed" ||
    context.data.status === "expired" ||
    context.data.status === "released"
  )
    return { success: true as const, data: { action: "complete" as const } }
  if (context.data.checkoutAttemptLeaseUntil !== undefined && context.data.checkoutAttemptLeaseUntil > Date.now()) {
    await ctx.runMutation(internal.ticketing.ticketReservationDeferMutation, {
      orderId: args.orderId,
      reason: "A server-side Billing request is still in progress",
    })
    return { success: true as const, data: { action: "deferred" as const } }
  }

  const config = billingEventorenClient.configRead()
  if (!config.success) {
    await ctx.runMutation(internal.ticketing.ticketReservationDeferMutation, {
      orderId: args.orderId,
      reason: config.errorMessage,
    })
    return config
  }
  const expirationResult = await billingEventorenClient.ticketCheckoutExpire(config.data, context.data.paymentReference)
  if (!expirationResult.success) {
    await ctx.runMutation(internal.ticketing.ticketReservationDeferMutation, {
      orderId: args.orderId,
      reason: expirationResult.errorMessage,
    })
    return expirationResult
  }
  if (expirationResult.data.kind === "not_found") {
    return await ctx.runMutation(internal.ticketing.ticketReservationReleaseMutation, {
      orderId: args.orderId,
      reason: "Billing has no persisted payment context",
    })
  }

  const status = expirationResult.data.data
  if (status.payment === "expired")
    return await ctx.runMutation(internal.ticketing.ticketReservationExpireMutation, {
      orderId: args.orderId,
      paymentReference: status.paymentReference,
      billingOrderReference: status.orderReference,
      stripeMode: status.stripeMode,
      reason: "Billing confirmed that the checkout session expired",
    })
  if (status.payment === "pending") {
    await ctx.runMutation(internal.ticketing.ticketReservationDeferMutation, {
      orderId: args.orderId,
      reason: "Billing still reports a payable pending checkout",
    })
    return { success: true as const, data: { action: "deferred" as const } }
  }
  return await ctx.runMutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
    orderId: args.orderId,
    paymentReference: status.paymentReference,
    billingOrderReference: status.orderReference,
    stripeMode: status.stripeMode,
    payment: status.payment,
  })
}
