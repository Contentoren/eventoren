import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"

const maxCategories = 100

export const catalogCategoryHiddenListQuery = query({
  args: { token: v.string() },
  handler: (ctx, args): PromiseResult<readonly string[]> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId }) => {
      const op = "catalogCategoryHiddenListQuery"
      const authorization = await catalogAdminAuthorizeFn(authorizedCtx, userId)
      if (!authorization.success) return authorization
      const categories = await authorizedCtx.db.query("catalogHiddenCategories").take(maxCategories + 1)
      if (categories.length > maxCategories)
        return createResultError(op, `A maximum of ${maxCategories} hidden categories is allowed`)
      return createResult(categories.map((category) => category.category))
    }),
})
