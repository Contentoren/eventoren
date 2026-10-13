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
    const claim = { deliveryMode: claimed.data.deliveryMode, attemptCount: claimed.data.attemptCount }
    const retry = (errorMessage: string) => fulfillmentRetry(ctx, args.workId, errorMessage, claim)

    const config = billingEventorenClient.configRead()
    if (!config.success) return await retry(config.errorMessage)
    const workOrder = await ctx.runQuery(internal.ticketing.ticketFulfillmentWorkOrderIdQuery, args)
    if (!workOrder.success) return await retry(workOrder.errorMessage)
    const capability = await ctx.runMutation(internal.ticketing.ticketOrderAccessCapabilityEnsureMutation, {
      orderId: workOrder.data.orderId,
      publicBaseUrl: config.data.publicBaseUrl,
    })
    if (!capability.success) return await retry(capability.errorMessage)
    const onlineUrl = await ctx.runMutation(internal.ticketing.ticketFulfillmentWorkOnlineUrlEnsureMutation, {
      workId: args.workId,
      onlineTicketUrl: capability.data.accessUrl,
      ...claim,
    })
    if (!onlineUrl.success) return await retry(onlineUrl.errorMessage)
    if ("stale" in onlineUrl.data && onlineUrl.data.stale)
      return createResult({ prepared: false, replayed: false, stale: true })

    const context = await ctx.runQuery(internal.ticketing.ticketFulfillmentWorkContextQuery, args)
    if (!context.success) return await retry(context.errorMessage)
    if (context.data.deliveryMode !== claim.deliveryMode)
      return createResult({ prepared: false, replayed: false, stale: true })
    if (!context.data.onlineTicketUrl) return await retry("The fulfillment work has no stable ticket access URL")
    if (context.data.stripeMode !== config.data.stripeMode)
      return await retry("The fulfillment Stripe mode does not match Billing configuration")
    const request = {
      ...context.data.snapshot,
      onlineTicketUrl: context.data.onlineTicketUrl,
      organizationId: config.data.organizationId,
    }
    const prepared = await billingEventorenClient.ticketFulfillmentPrepare(config.data, request)
    if (!prepared.success) return await retry(prepared.errorMessage)
    if (
      prepared.data.orderReference !== request.orderReference ||
      prepared.data.paymentReference !== request.paymentReference
    )
      return await retry("Billing returned mismatched fulfillment correlation")
    // An omitted legacy response purpose belongs to this request, never to the
    // work's possibly promoted purpose. Billing may already have settled first;
    // wait for local reconciliation instead of marking the old claim prepared.
    if ((prepared.data.deliveryMode ?? claim.deliveryMode) !== claim.deliveryMode)
      return await retry("Billing returned a different fulfillment delivery mode")
    return await ctx.runMutation(internal.ticketing.ticketFulfillmentWorkPreparedMutation, {
      workId: args.workId,
      fulfillmentReference: prepared.data.fulfillmentReference,
      ...claim,
    })
  },
})

async function fulfillmentRetry(
  ctx: ActionCtx,
  workId: Id<"ticketFulfillmentWork">,
  errorMessage: string,
  claim: { deliveryMode: "tickets_only" | "paid"; attemptCount: number },
) {
  return await ctx.runMutation(internal.ticketing.ticketFulfillmentWorkRetryMutation, {
    workId,
    errorMessage,
    ...claim,
  })
}
