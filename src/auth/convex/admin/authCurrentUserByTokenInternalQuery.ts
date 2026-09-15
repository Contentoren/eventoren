import { v } from "convex/values"
import { internalQuery, type QueryCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DocUser } from "#src/auth/convex/IdUser.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

export const authCurrentUserByTokenInternalQuery = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args): PromiseResult<DocUser> => authCurrentUserByTokenFn(ctx, args.token),
})

async function authCurrentUserByTokenFn(ctx: QueryCtx, token: string): PromiseResult<DocUser> {
  const op = "authCurrentUserByTokenFn"
  return authQueryTokenToUserId(ctx, { token }, async (queryCtx, { userId }) => {
    const session = await queryCtx.db
      .query("authSessions")
      .withIndex("token", (q) => q.eq("token", token))
      .unique()
    if (!session || session.userId !== userId || session.expiresAt <= new Date().toISOString() || session.deletedAt) {
      return createResultError(op, "Authentication session is no longer valid")
    }

    const user = await queryCtx.db.get("users", userId)
    if (!user || user.deletedAt) return createResultError(op, "User not found")
    return createResult(user)
  })
}
