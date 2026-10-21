import type { QueryCtx } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authCredentialResolve } from "#src/utils/convex_backend/authCredentialResolve.ts"

export async function authQueryCredentialToUserId<T extends { token: string }, R>(
  ctx: QueryCtx,
  args: T,
  fn: (ctx: QueryCtx, data: Omit<T, "token"> & { userId: IdUser }) => PromiseResult<R>,
): PromiseResult<R> {
  const op = "authQueryCredentialToUserId"
  if (!args.token) {
    return createResultError(op, "missing token")
  }
  const verifiedResult = await authCredentialResolve(ctx, args.token)
  if (!verifiedResult.success) {
    return verifiedResult
  }
  const userId = verifiedResult.data.userId
  const { token, ...data } = args
  const newData = { ...data, userId }
  return fn(ctx, newData)
}
