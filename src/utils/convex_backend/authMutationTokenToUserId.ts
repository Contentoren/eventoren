import type { MutationCtx } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authCredentialResolve } from "#src/utils/convex_backend/authCredentialResolve.ts"

export async function authMutationTokenToUserId<T extends { token: string }, R>(
  ctx: MutationCtx,
  args: T,
  fn: (ctx: MutationCtx, data: Omit<T, "token"> & { userId: IdUser }) => PromiseResult<R>,
): PromiseResult<R> {
  const op = "authMutationTokenToUserId"
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
