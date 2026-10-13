import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultErrorCode, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { ticketOrderProjectionCreate } from "./ticketOrderProjectionCreate.js"

// Deprecated compatibility endpoint. Never return a partial array; clients with
// more orders must switch to ticketOrderListMinePaginatedQuery.
const legacyOrderLimit = 50
export const ticketOrderListMineQuery = query({
  args: { token: v.string() },
  handler: async (ctx, args): PromiseResult<readonly unknown[]> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, authorizedArgs): PromiseResult<readonly unknown[]> => {
      const orders = await authorizedCtx.db
        .query("ticketOrders")
        .withIndex("ownerUserIdAndCreatedAt", (q) => q.eq("ownerUserId", authorizedArgs.userId))
        .order("desc")
        .take(legacyOrderLimit + 1)
      if (orders.length > legacyOrderLimit)
        return {
          ...createResultErrorCode(
            "ticketOrderListMineQuery",
            `Order history exceeds ${legacyOrderLimit} orders. Use ticketOrderListMinePaginatedQuery instead.`,
            "ticketing.order-history.limit-exceeded",
          ),
          statusCode: 400,
        }
      const projections = []
      for (const order of orders.sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) ||
          left._creationTime - right._creationTime ||
          left._id.localeCompare(right._id),
      )) {
        const projection = await ticketOrderProjectionCreate(authorizedCtx, order._id)
        if (!projection) continue
        projections.push(projection.data)
      }
      return createResult(projections)
    }),
})
