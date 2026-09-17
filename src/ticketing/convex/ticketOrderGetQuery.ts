import { query } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketOrderAccessResolve } from "./ticketOrderAccessResolve.js"
import { ticketOrderProjectionCreate } from "./ticketOrderProjectionCreate.js"

export const ticketOrderGetQuery = query({
  args: {
    orderId: v.id("ticketOrders"),
    token: v.optional(v.string()),
    guestAccessToken: v.optional(v.string()),
  },
  handler: async (ctx, args): PromiseResult<unknown> => {
    const accessResult = await ticketOrderAccessResolve(args)
    if (!accessResult.success) return accessResult
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError("ticketOrderGetQuery", "The order was not found")
    const authorized =
      (accessResult.data.userId !== undefined && order.ownerUserId === accessResult.data.userId) ||
      (accessResult.data.guestAccessDigest !== undefined &&
        (order.guestAccessDigest === accessResult.data.guestAccessDigest ||
          (order.emailAccessDigest === accessResult.data.guestAccessDigest &&
            order.emailAccessRevokedAt === undefined)))
    if (!authorized) return createResultError("ticketOrderGetQuery", "The order was not found")
    return createResult(await ticketOrderProjectionCreate(ctx, args.orderId))
  },
})
