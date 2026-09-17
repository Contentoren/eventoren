import { internal } from "#convex/_generated/api.js"
import { internalAction } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { billingEventorenClient } from "./billingEventorenClient.js"

export const ticketFulfillmentWorkScheduledAction = internalAction({
  args: {},
  handler: async (ctx): PromiseResult<{ fulfilled: number }> => {
    const config = billingEventorenClient.configRead()
    if (!config.success) return config
    const due = await ctx.runQuery(internal.ticketing.ticketFulfillmentWorkDueQuery, {
      stripeMode: config.data.stripeMode,
    })
    if (!due.success) return due
    for (const work of due.data)
      await ctx.runAction(internal.ticketing.ticketFulfillmentPrepareAction, { workId: work.workId })
    return createResult({ fulfilled: due.data.length })
  },
})
