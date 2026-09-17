import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { type ActionCtx, internalAction } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { billingEventorenClient } from "./billingEventorenClient.js"

export const ticketFulfillmentPrepareAction = internalAction({
  args: { workId: v.id("ticketFulfillmentWork") },
  handler: async (ctx, args): PromiseResult<unknown> => {
    const claimed = await ctx.runMutation(internal.ticketing.ticketFulfillmentWorkClaimMutation, args)
    if (!claimed.success) return claimed
    if (!claimed.data.claimed) return createResult({ action: "already-running-or-prepared" as const })

    const config = billingEventorenClient.configRead()
    if (!config.success) return await fulfillmentRetry(ctx, args.workId, config.errorMessage)
    const workOrder = await ctx.runQuery(internal.ticketing.ticketFulfillmentWorkOrderIdQuery, args)
    if (!workOrder.success) return await fulfillmentRetry(ctx, args.workId, workOrder.errorMessage)
    const capability = await ctx.runMutation(internal.ticketing.ticketOrderAccessCapabilityEnsureMutation, {
      orderId: workOrder.data.orderId,
      publicBaseUrl: config.data.publicBaseUrl,
    })
    if (!capability.success) return await fulfillmentRetry(ctx, args.workId, capability.errorMessage)
    const onlineUrl = await ctx.runMutation(internal.ticketing.ticketFulfillmentWorkOnlineUrlEnsureMutation, {
      workId: args.workId,
      onlineTicketUrl: capability.data.accessUrl,
    })
    if (!onlineUrl.success) return await fulfillmentRetry(ctx, args.workId, onlineUrl.errorMessage)

    const context = await ctx.runQuery(internal.ticketing.ticketFulfillmentWorkContextQuery, args)
    if (!context.success) return await fulfillmentRetry(ctx, args.workId, context.errorMessage)
    if (!context.data.onlineTicketUrl)
      return await fulfillmentRetry(ctx, args.workId, "The fulfillment work has no stable ticket access URL")
    if (context.data.stripeMode !== config.data.stripeMode)
      return await fulfillmentRetry(
        ctx,
        args.workId,
        "The fulfillment Stripe mode does not match Billing configuration",
      )
    const request = {
      ...context.data.snapshot,
      onlineTicketUrl: context.data.onlineTicketUrl,
      organizationId: config.data.organizationId,
    }
    const prepared = await billingEventorenClient.ticketFulfillmentPrepare(config.data, request)
    if (!prepared.success) return await fulfillmentRetry(ctx, args.workId, prepared.errorMessage)
    if (
      prepared.data.orderReference !== request.orderReference ||
      prepared.data.paymentReference !== request.paymentReference
    )
      return await fulfillmentRetry(ctx, args.workId, "Billing returned mismatched fulfillment correlation")
    return await ctx.runMutation(internal.ticketing.ticketFulfillmentWorkPreparedMutation, {
      workId: args.workId,
      fulfillmentReference: prepared.data.fulfillmentReference,
    })
  },
})

async function fulfillmentRetry(ctx: ActionCtx, workId: Id<"ticketFulfillmentWork">, errorMessage: string) {
  return await ctx.runMutation(internal.ticketing.ticketFulfillmentWorkRetryMutation, { workId, errorMessage })
}
