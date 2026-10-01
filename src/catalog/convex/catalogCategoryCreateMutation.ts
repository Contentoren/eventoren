import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"

const maxCategories = 100

export const catalogCategoryCreateMutation = mutation({
  args: { category: v.string(), token: v.string() },
  handler: (ctx, args) =>
    authMutationTokenToUserId(ctx, args, async (authorizedCtx, { userId }): PromiseResult<void> => {
      const op = "catalogCategoryCreateMutation"
      const authorization = await catalogAdminAuthorizeFn(authorizedCtx, userId)
      if (!authorization.success) return authorization
      const category = args.category.trim()
      if (!category) return createResultError(op, "Category is required")
      const existing = await authorizedCtx.db
        .query("catalogCategories")
        .withIndex("category", (query) => query.eq("category", category))
        .unique()
      if (!existing) {
        const categories = await authorizedCtx.db.query("catalogCategories").take(maxCategories)
        if (categories.length >= maxCategories)
          return createResultError(op, `A maximum of ${maxCategories} categories is allowed`)
        await authorizedCtx.db.insert("catalogCategories", { category })
      }
      const hidden = await authorizedCtx.db
        .query("catalogHiddenCategories")
        .withIndex("category", (query) => query.eq("category", category))
        .unique()
      if (hidden) await authorizedCtx.db.delete("catalogHiddenCategories", hidden._id)
      return createResult(undefined)
    }),
})
