import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import type { DecodedToken } from "#src/auth/model/DecodedToken.ts"
import { verifyTokenResult } from "#src/auth/server/jwt_token/verifyTokenResult.ts"

export async function authTokenSessionResolve(ctx: QueryCtx | MutationCtx, token: string): PromiseResult<DecodedToken> {
  const op = "authTokenSessionResolve"
  if (!token) return createResultError(op, "missing token")

  const verified = await verifyTokenResult(token)
  if (!verified.success) return verified
  const userId = verified.data.sub as IdUser
  const now = new Date().toISOString()
  const session = await ctx.db
    .query("authSessions")
    .withIndex("token", (q) => q.eq("token", token))
    .unique()
  if (
    !session ||
    session.userId !== userId ||
    session.expiresAt <= now ||
    session.deletedAt ||
    verified.data.exp * 1000 <= Date.now()
  ) {
    return createResultError(op, "Authentication session is no longer valid")
  }

  const user = await ctx.db.get("users", userId)
  if (!user || user.deletedAt) return createResultError(op, "User not found")
  return verified
}
