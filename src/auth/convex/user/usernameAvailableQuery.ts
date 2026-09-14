import { v } from "convex/values"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"

export const usernameAvailableFields = {
  username: v.string(),
} as const

export type UsernameAvailableValidatorType = typeof usernameAvailableValidator.type
export const usernameAvailableValidator = v.object(usernameAvailableFields)

export const usernameAvailableQuery = query({
  args: usernameAvailableFields,
  handler: async (ctx: QueryCtx, args) => usernameAvailableFn(ctx, args),
})

export async function usernameAvailableFn(ctx: QueryCtx, args: UsernameAvailableValidatorType): PromiseResult<boolean> {
  const op = "usernameAvailableFn"
  const user = await ctx.db
    .query("users")
    .withIndex("username", (q) => q.eq("username", args.username))
    .unique()
  if (user) {
    return createResult(false)
  }
  return createResult(true)
}
