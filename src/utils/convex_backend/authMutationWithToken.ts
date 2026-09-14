import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DecodedToken } from "#src/auth/model/DecodedToken.ts"
import { verifyTokenResult } from "#src/auth/server/jwt_token/verifyTokenResult.ts"

export async function authMutationWithToken<T extends { token: string }, R>(
  ctx: MutationCtx,
  args: T,
  fn: (ctx: MutationCtx, data: Omit<T, "token">, decodedToken: DecodedToken) => Promise<R>,
): PromiseResult<R> {
  const op = "authMutationWithToken"
  if (!args.token) {
    return createResultError(op, "missing token")
  }
  const verifiedResult = await verifyTokenResult(args.token)
  if (!verifiedResult.success) {
    console.info(verifiedResult)
    return verifiedResult
  }
  const { token, ...data } = args
  const out = await fn(ctx, data, verifiedResult.data)
  return createResult(out)
}
