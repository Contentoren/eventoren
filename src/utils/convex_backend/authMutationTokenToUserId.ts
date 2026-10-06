import type { MutationCtx } from "#convex/_generated/server.js"
import { type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"

export async function authMutationTokenToUserId<T extends { token: string }, R>(
  ctx: MutationCtx,
  args: T,
  fn: (ctx: MutationCtx, data: Omit<T, "token"> & { userId: IdUser }) => PromiseResult<R>,
): PromiseResult<R> {
  const verifiedResult = await authTokenSessionResolve(ctx, args.token)
  if (!verifiedResult.success) {
    return verifiedResult
  }
  const userId = verifiedResult.data.sub as IdUser
  const { token, ...data } = args
  const newData = { ...data, userId }
  // console.log({ op, args, data, newData })
  return fn(ctx, newData)
}
