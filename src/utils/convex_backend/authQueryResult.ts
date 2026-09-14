import type { QueryCtx } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import { verifyTokenResult } from "#src/auth/server/jwt_token/verifyTokenResult.ts"

export async function authQueryResult<T extends { token: string }, R>(
  ctx: QueryCtx,
  args: T,
  fn: (ctx: QueryCtx, data: Omit<T, "token">) => PromiseResult<R>,
): PromiseResult<R> {
  const op = "authQueryResult"
  if (!args.token) {
    return createResultError(op, "missing token")
  }
  const verifiedResult = await verifyTokenResult(args.token)
  if (!verifiedResult.success) {
    console.info(verifiedResult)
    return verifiedResult
  }
  const { token, ...data } = args
  return fn(ctx, data)
}
