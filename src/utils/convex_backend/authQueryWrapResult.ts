import type { QueryCtx } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"

export async function authQueryWrapResult<T extends { token: string }, R>(
  ctx: QueryCtx,
  args: T,
  fn: (ctx: QueryCtx, data: Omit<T, "token">) => Promise<R>,
): PromiseResult<R> {
  const op = "authQueryWrapResult"
  const verifiedResult = await authTokenSessionResolve(ctx, args.token)
  if (!verifiedResult.success) {
    return verifiedResult
  }
  const { token, ...data } = args
  const out = await fn(ctx, data)
  return createResult(out)
}
