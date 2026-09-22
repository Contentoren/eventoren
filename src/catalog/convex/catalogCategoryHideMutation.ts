import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"

export const catalogCategoryHideMutation = mutation({
  args: { category: v.string(), token: v.string() },
  handler: (ctx, args) =>
    authMutationTokenToUserId(ctx, args, async (authorizedCtx, { userId }): PromiseResult<void> => {
      const op = "catalogCategoryHideMutation"
      const authorization = await catalogAdminAuthorizeFn(authorizedCtx, userId)
      if (!authorization.success) return authorization
      const category = args.category.trim()
      if (!category) return createResultError(op, "Category is required")
      const existing = await authorizedCtx.db
        .query("catalogHiddenCategories")
        .withIndex("category", (query) => query.eq("category", category))
        .unique()
      if (existing) return createResult(undefined)
      await authorizedCtx.db.insert("catalogHiddenCategories", {
        category,
        hiddenAt: new Date().toISOString(),
        hiddenByUserId: userId,
      })
      return createResult(undefined)
    }),
})
