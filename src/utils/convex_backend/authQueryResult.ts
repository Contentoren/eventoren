import type { QueryCtx } from "#convex/_generated/server.js"
import { type PromiseResult } from "#result"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"

export async function authQueryResult<T extends { token: string }, R>(
  ctx: QueryCtx,
  args: T,
  fn: (ctx: QueryCtx, data: Omit<T, "token">) => PromiseResult<R>,
): PromiseResult<R> {
  const verifiedResult = await authTokenSessionResolve(ctx, args.token)
  if (!verifiedResult.success) {
    return verifiedResult
  }
  const { token, ...data } = args
  return fn(ctx, data)
}
