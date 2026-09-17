import { query } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketOrderAccessResolve } from "./ticketOrderAccessResolve.js"
import { ticketOrderProjectionCreate } from "./ticketOrderProjectionCreate.js"

export const ticketOrderByAccessTokenQuery = query({
  args: { guestAccessToken: v.string() },
  handler: async (ctx, args): PromiseResult<unknown> => {
    const op = "ticketOrderByAccessTokenQuery"
    const accessResult = await ticketOrderAccessResolve({ guestAccessToken: args.guestAccessToken })
    if (!accessResult.success) return createResultError(op, "The order was not found")
    const digest = accessResult.data.guestAccessDigest
    if (!digest) return createResultError(op, "The order was not found")
    const order = await ctx.db
      .query("ticketOrders")
      .withIndex("emailAccessDigest", (q) => q.eq("emailAccessDigest", digest))
      .unique()
    if (!order || order.emailAccessRevokedAt !== undefined) return createResultError(op, "The order was not found")
    return createResult(await ticketOrderProjectionCreate(ctx, order._id))
  },
})
