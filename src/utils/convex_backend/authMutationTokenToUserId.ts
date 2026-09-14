import type { MutationCtx } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { verifyTokenGetUserId } from "#src/auth/server/jwt_token/verifyTokenGetUserId.ts"

export async function authMutationTokenToUserId<T extends { token: string }, R>(
  ctx: MutationCtx,
  args: T,
  fn: (ctx: MutationCtx, data: Omit<T, "token"> & { userId: IdUser }) => PromiseResult<R>,
): PromiseResult<R> {
  const op = "authMutationTokenToUserId"
  if (!args.token) {
    return createResultError(op, "missing token")
  }
  const verifiedResult = await verifyTokenGetUserId(args.token)
  if (!verifiedResult.success) {
    console.info(verifiedResult)
    return verifiedResult
  }
  const userId = verifiedResult.data
  const { token, ...data } = args
  const newData = { ...data, userId }
  // console.log({ op, args, data, newData })
  return fn(ctx, newData)
}
