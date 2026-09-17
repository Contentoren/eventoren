import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketFulfillmentWorkOnlineUrlEnsureMutation = internalMutation({
  args: { workId: v.id("ticketFulfillmentWork"), onlineTicketUrl: v.string() },
  handler: async (ctx, args): PromiseResult<{ onlineTicketUrl: string; replayed: boolean }> => {
    const op = "ticketFulfillmentWorkOnlineUrlEnsureMutation"
    const work = await ctx.db.get(args.workId)
    if (!work) return createResultError(op, "The fulfillment work was not found")
    if (work.onlineTicketUrl !== undefined)
      return createResult({ onlineTicketUrl: work.onlineTicketUrl, replayed: true })

    let url: URL
    try {
      url = new URL(args.onlineTicketUrl)
    } catch (error) {
      return createResultError(op, "The ticket access URL is invalid", String(error))
    }
    if (url.username || url.password || (url.protocol !== "http:" && url.protocol !== "https:"))
      return createResultError(op, "The ticket access URL is invalid")

    await ctx.db.patch("ticketFulfillmentWork", work._id, {
      onlineTicketUrl: args.onlineTicketUrl,
      updatedAt: new Date().toISOString(),
    })
    return createResult({ onlineTicketUrl: args.onlineTicketUrl, replayed: false })
  },
})
