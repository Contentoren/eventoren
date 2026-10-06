import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DecodedToken } from "#src/auth/model/DecodedToken.ts"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"

export async function authMutationWithToken<T extends { token: string }, R>(
  ctx: MutationCtx,
  args: T,
  fn: (ctx: MutationCtx, data: Omit<T, "token">, decodedToken: DecodedToken) => Promise<R>,
): PromiseResult<R> {
  const op = "authMutationWithToken"
  const verifiedResult = await authTokenSessionResolve(ctx, args.token)
  if (!verifiedResult.success) {
    return verifiedResult
  }
  const { token, ...data } = args
  const out = await fn(ctx, data, verifiedResult.data)
  return createResult(out)
}
