import type { MutationCtx } from "#convex/_generated/server.js"
import { type PromiseResult } from "#result"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"

export async function authMutationResult<T extends { token: string }, R>(
  ctx: MutationCtx,
  args: T,
  fn: (ctx: MutationCtx, data: Omit<T, "token">) => PromiseResult<R>,
): PromiseResult<R> {
  const verifiedResult = await authTokenSessionResolve(ctx, args.token)
  if (!verifiedResult.success) {
    return verifiedResult
  }
  const { token, ...data } = args
  return fn(ctx, data)
}
