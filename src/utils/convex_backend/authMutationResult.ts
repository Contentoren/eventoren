import type { MutationCtx } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import { verifyTokenResult } from "#src/auth/server/jwt_token/verifyTokenResult.ts"

export async function authMutationResult<T extends { token: string }, R>(
  ctx: MutationCtx,
  args: T,
  fn: (ctx: MutationCtx, data: Omit<T, "token">) => PromiseResult<R>,
): PromiseResult<R> {
  const op = "authMutationResult"
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
