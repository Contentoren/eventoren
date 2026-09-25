import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { ticketOrderProjectionCreate } from "./ticketOrderProjectionCreate.js"

// Deprecated: retain the complete, unbounded array contract for existing clients.
// New callers should use ticketOrderListMinePaginatedQuery.
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
