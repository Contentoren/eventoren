import { query } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { createResult, type PromiseResult } from "#result"
import { ticketOrderProjectionCreate } from "./ticketOrderProjectionCreate.js"

export const ticketOrderListMineQuery = query({
  args: { token: v.string() },
  handler: async (ctx, args): PromiseResult<readonly unknown[]> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, authorizedArgs) => {
      const orders = await authorizedCtx.db
        .query("ticketOrders")
        .withIndex("ownerUserId", (q) => q.eq("ownerUserId", authorizedArgs.userId))
        .collect()
      const projections = []
      for (const order of orders.sort((left, right) => right.createdAt.localeCompare(left.createdAt))) {
        const projection = await ticketOrderProjectionCreate(authorizedCtx, order._id)
        if (projection) projections.push(projection)
      }
      return createResult(projections)
    }),
})
